import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import type { Database } from '$lib/server/db';
import {
	sleepDailyAdherence,
	sleepSettings,
	type SleepAdherenceStatus
} from '$lib/server/db/trackers/sleep';
import { dateKeysEndingAt, isValidTimeZone, localDateForInstant } from '$lib/trackers/dates';
import { getTrackedScreenTimePackages } from '../../screen-time/server/screen-time';
import {
	calculateSleepAdherence,
	DEFAULT_BEDTIME,
	MAX_SLEEP_DAYS,
	SleepPayloadError,
	type CalculatedSleepAdherence,
	type SleepUsagePayload
} from '../sleep';

export async function getSleepSettings(db: Database, userId: string) {
	const [settings] = await db
		.select()
		.from(sleepSettings)
		.where(eq(sleepSettings.userId, userId))
		.limit(1);
	return settings ?? null;
}

export async function ensureSleepSettings(db: Database, userId: string, requestedTimeZone: string) {
	const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
	await db
		.insert(sleepSettings)
		.values({ userId, timeZone })
		.onConflictDoUpdate({
			target: sleepSettings.userId,
			set: { timeZone, updatedAt: new Date() }
		});
	return (await getSleepSettings(db, userId))!;
}

export async function updateSleepSettings(
	db: Database,
	userId: string,
	values: { bedtime: string; remindersEnabled: boolean; timeZone: string }
) {
	const current = await ensureSleepSettings(db, userId, values.timeZone);
	await db
		.update(sleepSettings)
		.set({
			bedtime: values.bedtime,
			remindersEnabled: values.remindersEnabled,
			updatedAt: new Date()
		})
		.where(eq(sleepSettings.userId, userId));
	if (current.bedtime !== values.bedtime) await removePendingAdherence(db, userId);
	return { bedtime: values.bedtime, remindersEnabled: values.remindersEnabled };
}

export function getSleepAdherence(
	db: Database,
	userId: string,
	startDate: string,
	endDate: string
) {
	return db
		.select()
		.from(sleepDailyAdherence)
		.where(
			and(
				eq(sleepDailyAdherence.userId, userId),
				gte(sleepDailyAdherence.localDate, startDate),
				lte(sleepDailyAdherence.localDate, endDate)
			)
		)
		.orderBy(asc(sleepDailyAdherence.localDate));
}

export async function recordSleepUsagePayload(
	db: Database,
	userId: string,
	requestedTimeZone: string,
	payload: SleepUsagePayload
) {
	const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
	validatePayloadDates(payload, timeZone);
	const [settings, trackedPackages, existing] = await Promise.all([
		ensureSleepSettings(db, userId, timeZone),
		getTrackedScreenTimePackages(db, userId),
		getExistingAdherence(db, userId, payload.dates)
	]);
	const byDate = new Map(existing.map((summary) => [summary.localDate, summary]));
	const allowlist = new Set(trackedPackages);
	for (const date of payload.dates) {
		const existingSummary = byDate.get(date);
		if (existingSummary && existingSummary.status !== 'pending') continue;
		const summary = calculateSleepAdherence({
			date,
			bedtime: bedtimeForDate(existingSummary, settings.bedtime),
			timeZone,
			payload,
			trackedPackages: allowlist
		});
		await saveSleepAdherence(db, userId, summary);
	}
	await markSleepUsageReceived(db, userId, payload);
	return payload.dates.length;
}

function getExistingAdherence(db: Database, userId: string, dates: string[]) {
	return db
		.select()
		.from(sleepDailyAdherence)
		.where(
			and(eq(sleepDailyAdherence.userId, userId), inArray(sleepDailyAdherence.localDate, dates))
		);
}

function bedtimeForDate(
	existing: { configuredBedtime: string; status: SleepAdherenceStatus } | undefined,
	currentBedtime: string
) {
	return existing && existing.status !== 'pending' ? existing.configuredBedtime : currentBedtime;
}

async function saveSleepAdherence(db: Database, userId: string, summary: CalculatedSleepAdherence) {
	await db
		.insert(sleepDailyAdherence)
		.values({ userId, ...summary })
		.onConflictDoUpdate({
			target: [sleepDailyAdherence.userId, sleepDailyAdherence.localDate],
			set: { ...summary, syncedAt: new Date() },
			setWhere: sql`${sleepDailyAdherence.sourceTimestamp} <= excluded.source_timestamp`
		});
}

async function markSleepUsageReceived(db: Database, userId: string, payload: SleepUsagePayload) {
	await db
		.update(sleepSettings)
		.set({
			appVersion: payload.app_version,
			lastReceivedAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(sleepSettings.userId, userId));
}

async function removePendingAdherence(db: Database, userId: string) {
	await db
		.delete(sleepDailyAdherence)
		.where(and(eq(sleepDailyAdherence.userId, userId), eq(sleepDailyAdherence.status, 'pending')));
}

function validatePayloadDates(payload: SleepUsagePayload, timeZone: string) {
	const today = localDateForInstant(payload.timestamp, timeZone);
	const validDates = new Set(dateKeysEndingAt(today, MAX_SLEEP_DAYS));
	if (payload.dates.some((date) => !validDates.has(date))) {
		throw new SleepPayloadError(
			'Sleep adherence dates must be within the latest seven local days.'
		);
	}
}

export function pendingSleepSummary(date: string, bedtime = DEFAULT_BEDTIME) {
	return {
		localDate: date,
		configuredBedtime: bedtime,
		windowStartAt: null,
		windowEndAt: null,
		lateUsageSeconds: 0,
		latestScreenActivityAt: null,
		usedApps: [],
		violatingApps: [],
		status: 'pending' as const
	};
}
