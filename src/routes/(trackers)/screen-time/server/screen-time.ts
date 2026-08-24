import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import {
	screenTimeConnection,
	screenTimeDailySnapshot,
	screenTimeTrackedApp,
	type ScreenTimeAppValue,
	type ScreenTimeDailySnapshot
} from '$lib/server/db/trackers/screen-time';
import { isValidTimeZone } from '$lib/trackers/dates';
import type { ScreenTimeDay, ScreenTimePayload } from '../screen-time';

export async function getScreenTimeConnection(db: Database, userId: string) {
	const [connection] = await db
		.select()
		.from(screenTimeConnection)
		.where(eq(screenTimeConnection.userId, userId))
		.limit(1);
	return connection ?? null;
}

export async function createScreenTimeConnection(
	db: Database,
	userId: string,
	requestedTimeZone: string
) {
	const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
	const token = createScreenTimeToken();
	await saveScreenTimeConnection(db, userId, await hashScreenTimeToken(token), timeZone);
	return token;
}

export async function ensureScreenTimeConnection(
	db: Database,
	userId: string,
	requestedTimeZone: string
) {
	const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
	const existing = await getScreenTimeConnection(db, userId);
	if (existing) {
		if (existing.companionTimeZone !== timeZone) {
			await db
				.update(screenTimeConnection)
				.set({ companionTimeZone: timeZone, updatedAt: new Date() })
				.where(eq(screenTimeConnection.userId, userId));
		}
		return { userId, timeZone };
	}
	const tokenHash = await hashScreenTimeToken(createScreenTimeToken());
	await db
		.insert(screenTimeConnection)
		.values({ userId, tokenHash, timeZone, companionTimeZone: timeZone });
	return { userId, timeZone };
}

export async function findScreenTimeConnectionByToken(db: Database, token: string) {
	const tokenHash = await hashScreenTimeToken(token);
	const [connection] = await db
		.select({ userId: screenTimeConnection.userId, timeZone: screenTimeConnection.timeZone })
		.from(screenTimeConnection)
		.where(eq(screenTimeConnection.tokenHash, tokenHash))
		.limit(1);
	return connection ?? null;
}

export async function findScreenTimeConnectionByCompanionToken(db: Database, token: string) {
	const tokenHash = await hashScreenTimeToken(token);
	const [connection] = await db
		.select({
			userId: screenTimeConnection.userId,
			timeZone: screenTimeConnection.companionTimeZone
		})
		.from(screenTimeConnection)
		.where(eq(screenTimeConnection.companionTokenHash, tokenHash))
		.limit(1);
	if (!connection?.timeZone) return null;
	return { userId: connection.userId, timeZone: connection.timeZone };
}

export async function hasScreenTimeMeasurements(db: Database, userId: string) {
	const [measurement] = await db
		.select({ date: screenTimeDailySnapshot.localDate })
		.from(screenTimeDailySnapshot)
		.where(eq(screenTimeDailySnapshot.userId, userId))
		.limit(1);
	return Boolean(measurement);
}

export async function getDailyScreenTime(
	db: Database,
	userId: string,
	startDate: string,
	endDate: string
) {
	const [snapshots, trackedPackages] = await Promise.all([
		getRawDailyScreenTime(db, userId, startDate, endDate),
		getTrackedScreenTimePackages(db, userId)
	]);
	const allowlist = new Set(trackedPackages);
	return snapshots.map((snapshot) => trackedScreenTimeSnapshot(snapshot, allowlist));
}

export async function getTrackedScreenTimePackages(db: Database, userId: string) {
	const rows = await db
		.select({ packageName: screenTimeTrackedApp.packageName })
		.from(screenTimeTrackedApp)
		.where(eq(screenTimeTrackedApp.userId, userId));
	return rows.map(({ packageName }) => packageName);
}

export async function getKnownScreenTimeApps(db: Database, userId: string) {
	const [snapshots, trackedPackages] = await Promise.all([
		getAllScreenTimeApps(db, userId),
		getTrackedScreenTimePackages(db, userId)
	]);
	return knownScreenTimeApps(snapshots, new Set(trackedPackages));
}

export async function setScreenTimeAppTracked(
	db: Database,
	userId: string,
	packageName: string,
	tracked: boolean
) {
	if (tracked) await addTrackedScreenTimeApp(db, userId, packageName);
	else await removeTrackedScreenTimeApp(db, userId, packageName);
}

export function trackedScreenTimeSnapshot(
	snapshot: ScreenTimeDailySnapshot,
	allowlist: Set<string>
) {
	const apps = snapshot.apps.filter((app) => allowlist.has(app.package));
	const totalMinutes = apps.reduce((total, app) => total + app.minutes, 0);
	return { ...snapshot, totalMinutes, apps };
}

function knownScreenTimeApps(
	snapshots: Array<{ apps: ScreenTimeAppValue[] }>,
	trackedPackages: Set<string>
) {
	const apps = new Map<string, Pick<ScreenTimeAppValue, 'package' | 'name'>>();
	for (const snapshot of snapshots) rememberKnownApps(apps, snapshot.apps);
	for (const packageName of trackedPackages) rememberTrackedApp(apps, packageName);
	return [...apps.values()]
		.map((app) => ({ ...app, tracked: trackedPackages.has(app.package) }))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function rememberKnownApps(
	knownApps: Map<string, Pick<ScreenTimeAppValue, 'package' | 'name'>>,
	apps: ScreenTimeAppValue[]
) {
	for (const app of apps) {
		if (!knownApps.has(app.package)) {
			knownApps.set(app.package, { package: app.package, name: app.name });
		}
	}
}

function rememberTrackedApp(
	knownApps: Map<string, Pick<ScreenTimeAppValue, 'package' | 'name'>>,
	packageName: string
) {
	if (!knownApps.has(packageName))
		knownApps.set(packageName, { package: packageName, name: packageName });
}

function getRawDailyScreenTime(db: Database, userId: string, startDate: string, endDate: string) {
	return db
		.select()
		.from(screenTimeDailySnapshot)
		.where(
			and(
				eq(screenTimeDailySnapshot.userId, userId),
				gte(screenTimeDailySnapshot.localDate, startDate),
				lte(screenTimeDailySnapshot.localDate, endDate)
			)
		)
		.orderBy(asc(screenTimeDailySnapshot.localDate));
}

function getAllScreenTimeApps(db: Database, userId: string) {
	return db
		.select({ apps: screenTimeDailySnapshot.apps })
		.from(screenTimeDailySnapshot)
		.where(eq(screenTimeDailySnapshot.userId, userId))
		.orderBy(desc(screenTimeDailySnapshot.localDate));
}

async function addTrackedScreenTimeApp(db: Database, userId: string, packageName: string) {
	await db
		.insert(screenTimeTrackedApp)
		.values({ userId, packageName })
		.onConflictDoNothing({
			target: [screenTimeTrackedApp.userId, screenTimeTrackedApp.packageName]
		});
}

async function removeTrackedScreenTimeApp(db: Database, userId: string, packageName: string) {
	await db
		.delete(screenTimeTrackedApp)
		.where(
			and(
				eq(screenTimeTrackedApp.userId, userId),
				eq(screenTimeTrackedApp.packageName, packageName)
			)
		);
}

export async function recordScreenTimePayload(
	db: Database,
	connection: { userId: string; timeZone: string },
	payload: ScreenTimePayload
) {
	for (const day of payload.screen_time)
		await saveDailySnapshot(db, connection.userId, day, payload);
	await markConnectionReceived(db, connection.userId, payload);
	return payload.screen_time.length;
}

async function saveScreenTimeConnection(
	db: Database,
	userId: string,
	tokenHash: string,
	timeZone: string
) {
	await db
		.insert(screenTimeConnection)
		.values({ userId, tokenHash, timeZone })
		.onConflictDoUpdate({
			target: screenTimeConnection.userId,
			set: {
				tokenHash,
				timeZone,
				appVersion: null,
				device: null,
				source: null,
				lastReceivedAt: null,
				updatedAt: new Date()
			}
		});
}

async function saveDailySnapshot(
	db: Database,
	userId: string,
	day: ScreenTimeDay,
	payload: ScreenTimePayload
) {
	const sourceTimestamp = new Date(payload.timestamp);
	await db
		.insert(screenTimeDailySnapshot)
		.values({
			userId,
			localDate: day.date,
			totalMinutes: day.total_screen_time_minutes,
			apps: day.apps,
			sourceTimestamp
		})
		.onConflictDoUpdate({
			target: [screenTimeDailySnapshot.userId, screenTimeDailySnapshot.localDate],
			set: {
				totalMinutes: day.total_screen_time_minutes,
				apps: day.apps,
				sourceTimestamp,
				syncedAt: new Date()
			},
			setWhere: sql`${screenTimeDailySnapshot.sourceTimestamp} <= excluded.source_timestamp`
		});
}

async function markConnectionReceived(db: Database, userId: string, payload: ScreenTimePayload) {
	await db
		.update(screenTimeConnection)
		.set({
			appVersion: payload.app_version,
			device: payload.device ?? null,
			source: payload.source ?? 'screen_time',
			lastReceivedAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(screenTimeConnection.userId, userId));
}

export function createScreenTimeToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return `scr_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function hashScreenTimeToken(token: string) {
	const bytes = new TextEncoder().encode(token);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
