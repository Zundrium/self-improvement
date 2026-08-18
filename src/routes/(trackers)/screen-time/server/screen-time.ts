import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { screenTimeConnection, screenTimeDailySnapshot } from '$lib/server/db/trackers/screen-time';
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

export async function getDailyScreenTime(
	db: Database,
	userId: string,
	startDate: string,
	endDate: string
) {
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
