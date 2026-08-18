import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import { sleepConnection, sleepSession } from '$lib/server/db/trackers/sleep';
import { isValidTimeZone } from '$lib/trackers/dates';
import {
	calculateSleepSession,
	type CalculatedSleepSession,
	type HealthConnectSleepPayload
} from '../sleep';

export async function getSleepConnection(db: Database, userId: string) {
	const [connection] = await db
		.select()
		.from(sleepConnection)
		.where(eq(sleepConnection.userId, userId))
		.limit(1);
	return connection ?? null;
}

export async function createSleepConnection(
	db: Database,
	userId: string,
	requestedTimeZone: string
) {
	const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
	const token = createSleepToken();
	await saveSleepConnection(db, userId, await hashSleepToken(token), timeZone);
	return token;
}

export async function ensureSleepConnection(
	db: Database,
	userId: string,
	requestedTimeZone: string
) {
	const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
	const existing = await getSleepConnection(db, userId);
	if (existing) {
		if (existing.companionTimeZone !== timeZone) {
			await db
				.update(sleepConnection)
				.set({ companionTimeZone: timeZone, updatedAt: new Date() })
				.where(eq(sleepConnection.userId, userId));
		}
		return { userId, timeZone };
	}
	const tokenHash = await hashSleepToken(createSleepToken());
	await db
		.insert(sleepConnection)
		.values({ userId, tokenHash, timeZone, companionTimeZone: timeZone });
	return { userId, timeZone };
}

export async function findSleepConnectionByToken(db: Database, token: string) {
	const tokenHash = await hashSleepToken(token);
	const [connection] = await db
		.select({ userId: sleepConnection.userId, timeZone: sleepConnection.timeZone })
		.from(sleepConnection)
		.where(eq(sleepConnection.tokenHash, tokenHash))
		.limit(1);
	return connection ?? null;
}

export async function findSleepConnectionByCompanionToken(db: Database, token: string) {
	const tokenHash = await hashSleepToken(token);
	const [connection] = await db
		.select({ userId: sleepConnection.userId, timeZone: sleepConnection.companionTimeZone })
		.from(sleepConnection)
		.where(eq(sleepConnection.companionTokenHash, tokenHash))
		.limit(1);
	if (!connection?.timeZone) return null;
	return { userId: connection.userId, timeZone: connection.timeZone };
}

export async function updateSleepGoal(db: Database, userId: string, dailyGoalMinutes: number) {
	await db
		.update(sleepConnection)
		.set({ dailyGoalMinutes, updatedAt: new Date() })
		.where(eq(sleepConnection.userId, userId));
}

export async function getDailySleep(
	db: Database,
	userId: string,
	startDate: string,
	endDate: string
) {
	return db
		.select({
			localDate: sleepSession.localDate,
			durationSeconds: sql<number>`sum(${sleepSession.sleepDurationSeconds})`.mapWith(Number),
			sessionCount: sql<number>`count(*)`.mapWith(Number)
		})
		.from(sleepSession)
		.where(
			and(
				eq(sleepSession.userId, userId),
				gte(sleepSession.localDate, startDate),
				lte(sleepSession.localDate, endDate)
			)
		)
		.groupBy(sleepSession.localDate)
		.orderBy(asc(sleepSession.localDate));
}

export async function recordHealthConnectSleepPayload(
	db: Database,
	connection: { userId: string; timeZone: string },
	payload: HealthConnectSleepPayload
) {
	const sessions = calculatedSessions(payload, connection.timeZone);
	for (const session of sessions) await saveSleepSession(db, connection.userId, session);
	await markSleepConnectionReceived(db, connection.userId, payload.app_version);
	return sessions.length;
}

async function saveSleepConnection(
	db: Database,
	userId: string,
	tokenHash: string,
	timeZone: string
) {
	await db
		.insert(sleepConnection)
		.values({ userId, tokenHash, timeZone })
		.onConflictDoUpdate({
			target: sleepConnection.userId,
			set: { tokenHash, timeZone, appVersion: null, lastReceivedAt: null, updatedAt: new Date() }
		});
}

function calculatedSessions(payload: HealthConnectSleepPayload, timeZone: string) {
	const sessions = new Map<number, CalculatedSleepSession>();
	for (const record of payload.sleep) {
		const session = calculateSleepSession(record, timeZone);
		sessions.set(session.sessionEndAt.getTime(), session);
	}
	return [...sessions.values()];
}

async function saveSleepSession(db: Database, userId: string, session: CalculatedSleepSession) {
	await db
		.insert(sleepSession)
		.values({ userId, ...session })
		.onConflictDoUpdate({
			target: [sleepSession.userId, sleepSession.sessionEndAt],
			set: {
				sessionStartAt: session.sessionStartAt,
				localDate: session.localDate,
				sessionDurationSeconds: session.sessionDurationSeconds,
				sleepDurationSeconds: session.sleepDurationSeconds,
				stages: session.stages,
				dataOrigin: session.dataOrigin,
				syncedAt: new Date()
			}
		});
}

async function markSleepConnectionReceived(db: Database, userId: string, appVersion: string) {
	await db
		.update(sleepConnection)
		.set({ appVersion, lastReceivedAt: new Date(), updatedAt: new Date() })
		.where(eq(sleepConnection.userId, userId));
}

export function createSleepToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return `slp_${[...bytes].map(toHex).join('')}`;
}

function toHex(byte: number) {
	return byte.toString(16).padStart(2, '0');
}

export async function hashSleepToken(token: string) {
	const bytes = new TextEncoder().encode(token);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map(toHex).join('');
}
