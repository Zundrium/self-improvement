import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { stepConnection, stepDailyTotal } from '$lib/server/db/schema';
import {
	isLocalDayStart,
	isValidTimeZone,
	localDateForInstant,
	type HealthConnectPayload,
	type HealthConnectStep
} from '../steps';

export async function getStepConnection(db: Database, userId: string) {
	const [connection] = await db
		.select()
		.from(stepConnection)
		.where(eq(stepConnection.userId, userId))
		.limit(1);
	return connection ?? null;
}

export async function createStepConnection(
	db: Database,
	userId: string,
	requestedTimeZone: string
) {
	const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
	const token = createStepToken();
	await saveStepConnection(db, userId, await hashStepToken(token), timeZone);
	return token;
}

export async function ensureStepConnection(
	db: Database,
	userId: string,
	requestedTimeZone: string
) {
	const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
	const existing = await getStepConnection(db, userId);
	if (existing) {
		if (existing.companionTimeZone !== timeZone) {
			await db
				.update(stepConnection)
				.set({ companionTimeZone: timeZone, updatedAt: new Date() })
				.where(eq(stepConnection.userId, userId));
		}
		return { userId, timeZone };
	}
	const tokenHash = await hashStepToken(createStepToken());
	await db
		.insert(stepConnection)
		.values({ userId, tokenHash, timeZone, companionTimeZone: timeZone });
	return { userId, timeZone };
}

export async function findConnectionByToken(db: Database, token: string) {
	const tokenHash = await hashStepToken(token);
	const [connection] = await db
		.select({ userId: stepConnection.userId, timeZone: stepConnection.timeZone })
		.from(stepConnection)
		.where(eq(stepConnection.tokenHash, tokenHash))
		.limit(1);
	return connection ?? null;
}

export async function findConnectionByCompanionToken(db: Database, token: string) {
	const tokenHash = await hashStepToken(token);
	const [connection] = await db
		.select({ userId: stepConnection.userId, timeZone: stepConnection.companionTimeZone })
		.from(stepConnection)
		.where(eq(stepConnection.companionTokenHash, tokenHash))
		.limit(1);
	if (!connection?.timeZone) return null;
	return { userId: connection.userId, timeZone: connection.timeZone };
}

export async function updateStepGoal(db: Database, userId: string, dailyGoal: number) {
	await db
		.update(stepConnection)
		.set({ dailyGoal, updatedAt: new Date() })
		.where(eq(stepConnection.userId, userId));
}

export async function getDailySteps(
	db: Database,
	userId: string,
	startDate: string,
	endDate: string
) {
	return db
		.select()
		.from(stepDailyTotal)
		.where(
			and(
				eq(stepDailyTotal.userId, userId),
				gte(stepDailyTotal.localDate, startDate),
				lte(stepDailyTotal.localDate, endDate)
			)
		)
		.orderBy(asc(stepDailyTotal.localDate));
}

export async function recordHealthConnectPayload(
	db: Database,
	connection: { userId: string; timeZone: string },
	payload: HealthConnectPayload
) {
	const snapshots = dailySnapshots(payload.steps, connection.timeZone);
	for (const snapshot of snapshots) await saveSnapshot(db, connection.userId, snapshot);
	await markConnectionReceived(db, connection.userId, payload.app_version);
	return snapshots.length;
}

async function saveStepConnection(
	db: Database,
	userId: string,
	tokenHash: string,
	timeZone: string
) {
	await db
		.insert(stepConnection)
		.values({ userId, tokenHash, timeZone })
		.onConflictDoUpdate({
			target: stepConnection.userId,
			set: { tokenHash, timeZone, appVersion: null, lastReceivedAt: null, updatedAt: new Date() }
		});
}

async function markConnectionReceived(db: Database, userId: string, appVersion: string) {
	await db
		.update(stepConnection)
		.set({ appVersion, lastReceivedAt: new Date(), updatedAt: new Date() })
		.where(eq(stepConnection.userId, userId));
}

type DailySnapshot = {
	localDate: string;
	count: number;
	startAt: Date;
	endAt: Date;
};

function dailySnapshots(steps: HealthConnectStep[], timeZone: string) {
	const snapshots = new Map<string, DailySnapshot>();
	for (const step of steps) addDailySnapshot(snapshots, step, timeZone);
	return [...snapshots.values()];
}

function addDailySnapshot(
	snapshots: Map<string, DailySnapshot>,
	step: HealthConnectStep,
	timeZone: string
) {
	if (!isLocalDayStart(step.start_time, timeZone)) {
		throw new Error('Set the HC Webhook steps resolution to Daily.');
	}
	const snapshot = toDailySnapshot(step, timeZone);
	const existing = snapshots.get(snapshot.localDate);
	if (!existing || snapshot.endAt >= existing.endAt) snapshots.set(snapshot.localDate, snapshot);
}

function toDailySnapshot(step: HealthConnectStep, timeZone: string): DailySnapshot {
	return {
		localDate: localDateForInstant(step.start_time, timeZone),
		count: step.count,
		startAt: new Date(step.start_time),
		endAt: new Date(step.end_time)
	};
}

async function saveSnapshot(db: Database, userId: string, snapshot: DailySnapshot) {
	await db
		.insert(stepDailyTotal)
		.values({
			userId,
			localDate: snapshot.localDate,
			count: snapshot.count,
			sourceStartAt: snapshot.startAt,
			sourceEndAt: snapshot.endAt
		})
		.onConflictDoUpdate({
			target: [stepDailyTotal.userId, stepDailyTotal.localDate],
			set: {
				count: snapshot.count,
				sourceStartAt: snapshot.startAt,
				sourceEndAt: snapshot.endAt,
				syncedAt: new Date()
			},
			setWhere: sql`${stepDailyTotal.sourceEndAt} <= excluded.source_end_at`
		});
}

export function createStepToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return `stp_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function hashStepToken(token: string) {
	const bytes = new TextEncoder().encode(token);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
