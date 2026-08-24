import { CalendarDateTime, toZoned } from '@internationalized/date';
import { z } from 'zod';
import type { SleepAdherenceStatus, StoredSleepUsageApp } from '$lib/server/db/trackers/sleep';

export const DEFAULT_BEDTIME = '22:30';
export const LATE_USAGE_LIMIT_SECONDS = 300;
export const BEDTIME_WINDOW_SECONDS = 4 * 60 * 60;
export const MAX_SLEEP_DAYS = 7;
export const MAX_ACTIVITY_INTERVALS = 5_000;
export const MAX_SCREEN_INTERACTIVE_EVENTS = 2_000;

export class SleepPayloadError extends Error {}

const instantSchema = z.iso.datetime();
const usageIntervalSchema = z.object({
	package: z.string().trim().min(1).max(255),
	name: z.string().trim().min(1).max(120),
	start_time: instantSchema,
	end_time: instantSchema
});
const payloadSchema = z.object({
	timestamp: instantSchema,
	app_version: z.string().trim().min(1).max(40),
	source: z.literal('usage_events'),
	dates: z.array(z.iso.date()).min(1).max(MAX_SLEEP_DAYS),
	activity_intervals: z.array(usageIntervalSchema).max(MAX_ACTIVITY_INTERVALS),
	screen_interactive: z.array(instantSchema).max(MAX_SCREEN_INTERACTIVE_EVENTS)
});

export type SleepUsagePayload = z.infer<typeof payloadSchema>;
export type SleepUsageInterval = SleepUsagePayload['activity_intervals'][number];
type SummarizedUsageApp = StoredSleepUsageApp & { milliseconds: number };

export type CalculatedSleepAdherence = {
	localDate: string;
	configuredBedtime: string;
	windowStartAt: Date;
	windowEndAt: Date;
	lateUsageSeconds: number;
	latestScreenActivityAt: Date | null;
	usedApps: StoredSleepUsageApp[];
	violatingApps: StoredSleepUsageApp[];
	status: SleepAdherenceStatus;
	sourceTimestamp: Date;
};

export function parseSleepUsagePayload(input: unknown) {
	const payload = payloadSchema.parse(input);
	if (new Set(payload.dates).size !== payload.dates.length) {
		throw new SleepPayloadError('Sleep adherence dates must be unique.');
	}
	for (const interval of payload.activity_intervals) validateInterval(interval);
	return payload;
}

export function parseBedtime(value: unknown) {
	const bedtime = String(value ?? '').trim();
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(bedtime)) {
		throw new Error('Choose a valid bedtime.');
	}
	return bedtime;
}

export function parseRemindersEnabled(value: unknown) {
	if (typeof value !== 'boolean') throw new Error('Choose whether bedtime reminders are enabled.');
	return value;
}

export function calculateSleepAdherence(input: {
	date: string;
	bedtime: string;
	timeZone: string;
	payload: SleepUsagePayload;
	trackedPackages: Set<string>;
}): CalculatedSleepAdherence {
	const { start, end } = bedtimeWindow(input.date, input.bedtime, input.timeZone);
	const usageApps = summarizeApps(input.payload.activity_intervals, start, end);
	const selectedUsage = usageApps.filter((app) => input.trackedPackages.has(app.package));
	const selectedMilliseconds = selectedUsage.reduce((total, app) => total + app.milliseconds, 0);
	const lateUsageSeconds = Math.ceil(selectedMilliseconds / 1_000);
	const failed = selectedMilliseconds > LATE_USAGE_LIMIT_SECONDS * 1_000;
	const usedApps = usageApps.map(storedUsageApp);
	const collectedAt = new Date(input.payload.timestamp);
	return {
		localDate: input.date,
		configuredBedtime: input.bedtime,
		windowStartAt: start,
		windowEndAt: end,
		lateUsageSeconds,
		latestScreenActivityAt: latestScreenActivity(input.payload.screen_interactive, start, end),
		usedApps,
		violatingApps: selectedUsage.map(storedUsageApp),
		status: adherenceStatus(collectedAt, end, input.trackedPackages.size, failed),
		sourceTimestamp: collectedAt
	};
}

export function bedtimeWindow(date: string, bedtime: string, timeZone: string) {
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute] = parseBedtime(bedtime).split(':').map(Number);
	const start = toZoned(new CalendarDateTime(year, month, day, hour, minute), timeZone).toDate();
	return { start, end: new Date(start.getTime() + BEDTIME_WINDOW_SECONDS * 1_000) };
}

function validateInterval(interval: SleepUsageInterval) {
	if (Date.parse(interval.end_time) <= Date.parse(interval.start_time)) {
		throw new SleepPayloadError('Activity intervals must end after they start.');
	}
}

function summarizeApps(intervals: SleepUsageInterval[], start: Date, end: Date) {
	const byPackage = new Map<string, SummarizedUsageApp>();
	for (const interval of intervals) addInterval(byPackage, interval, start, end);
	return [...byPackage.values()].sort(
		(left, right) => right.seconds - left.seconds || left.name.localeCompare(right.name)
	);
}

function addInterval(
	apps: Map<string, SummarizedUsageApp>,
	interval: SleepUsageInterval,
	windowStart: Date,
	windowEnd: Date
) {
	const milliseconds = overlapMilliseconds(interval, windowStart, windowEnd);
	if (!milliseconds) return;
	const existing = apps.get(interval.package);
	const totalMilliseconds = (existing?.milliseconds ?? 0) + milliseconds;
	apps.set(interval.package, {
		package: interval.package,
		name: interval.name,
		seconds: Math.ceil(totalMilliseconds / 1_000),
		milliseconds: totalMilliseconds
	});
}

function overlapMilliseconds(interval: SleepUsageInterval, start: Date, end: Date) {
	const overlapStart = Math.max(Date.parse(interval.start_time), start.getTime());
	const overlapEnd = Math.min(Date.parse(interval.end_time), end.getTime());
	return Math.max(0, overlapEnd - overlapStart);
}

function storedUsageApp(app: SummarizedUsageApp): StoredSleepUsageApp {
	return { package: app.package, name: app.name, seconds: app.seconds };
}

function latestScreenActivity(events: string[], start: Date, end: Date) {
	const latest = events
		.map(Date.parse)
		.filter((instant) => instant >= start.getTime() && instant < end.getTime())
		.sort((left, right) => right - left)[0];
	return latest === undefined ? null : new Date(latest);
}

function adherenceStatus(
	collectedAt: Date,
	windowEnd: Date,
	trackedAppCount: number,
	failed: boolean
): SleepAdherenceStatus {
	if (!trackedAppCount || collectedAt < windowEnd) return 'pending';
	return failed ? 'fail' : 'pass';
}
