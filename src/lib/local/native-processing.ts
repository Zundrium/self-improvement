import { CalendarDateTime, toZoned } from '@internationalized/date';
import { z } from 'zod';
import { validationFailure } from '$domain/errors';
import type { SyncContext, TrackerId } from '$domain/model';
import type { ScreenTimePayload, SleepPayload, StepsPayload } from '$domain/payloads';
import { dateKeysEndingAt, isLocalDayStart, localDateForInstant } from '$lib/trackers/dates';
import { parseScreenTimePayload } from '../../routes/screen-time/screen-time';
import { parseHealthConnectPayload } from '../../routes/steps/steps';
import { notifyNewTrackerCompletions } from './completion-events';
import { buildGamification } from './gamification';
import { type LocalAppState, type LocalDomain, localAppStore } from './state';

const sleepIntervalSchema = z.object({
	package: z.string().trim().min(1).max(255),
	name: z.string().trim().min(1).max(120),
	start_time: z.iso.datetime(),
	end_time: z.iso.datetime()
});
const sleepPayloadSchema = z.object({
	timestamp: z.iso.datetime(),
	app_version: z.string().trim().min(1).max(40),
	source: z.literal('usage_events'),
	dates: z.array(z.iso.date()).min(1).max(7),
	activity_intervals: z.array(sleepIntervalSchema).max(5_000),
	screen_interactive: z.array(z.iso.datetime()).max(2_000)
});

type SleepInterval = z.infer<typeof sleepIntervalSchema>;
type StoredSleepDay = LocalAppState['sleep']['days'][number];
type UsageApp = StoredSleepDay['usedApps'][number] & { milliseconds: number };

export async function ingestNativePayload(
	tracker: TrackerId,
	context: SyncContext,
	payload: unknown
) {
	try {
		let before: LocalAppState | undefined;
		const domains = nativePayloadDomains(tracker);
		const after = await localAppStore.updateGamificationProjection(
			[...domains, 'gamification'],
			(state) => {
				before = structuredClone(state);
				processNativePayload(state, tracker, context, payload);
				buildGamification(state);
			}
		);
		if (!before) throw new Error('Native completion baseline was not loaded.');
		notifyNewTrackerCompletions(before, after);
	} catch (cause) {
		if (cause instanceof Error && cause.name === 'SyncFailure') throw cause;
		throw validationFailure(cause instanceof Error ? cause.message : undefined);
	}
}

function nativePayloadDomains(tracker: TrackerId): LocalDomain[] {
	if (tracker === 'steps') return ['steps'];
	if (tracker === 'sleep') return ['sleep', 'screenTime'];
	return ['screenTime'];
}

export function processNativePayload(
	state: LocalAppState,
	tracker: TrackerId,
	context: SyncContext,
	payload: unknown
) {
	if (tracker === 'steps') return processSteps(state, context, payload as StepsPayload);
	if (tracker === 'sleep') return processSleep(state, context, payload as SleepPayload);
	return processScreenTime(state, context, payload as ScreenTimePayload);
}

export function calculateBedtimeAdherence(input: {
	date: string;
	bedtime: string;
	timeZone: string;
	payload: SleepPayload;
	trackedPackages: Set<string>;
}): StoredSleepDay {
	const { start, end } = bedtimeWindow(input.date, input.bedtime, input.timeZone);
	const usage = summarizeApps(input.payload.activity_intervals, start, end);
	const selected = usage.filter((app) => input.trackedPackages.has(app.package));
	const milliseconds = selected.reduce((total, app) => total + app.milliseconds, 0);
	return {
		localDate: input.date,
		configuredBedtime: input.bedtime,
		windowStartAt: start.toISOString(),
		windowEndAt: end.toISOString(),
		lateUsageSeconds: Math.ceil(milliseconds / 1_000),
		latestScreenActivityAt: latestScreenActivity(input.payload.screen_interactive, start, end),
		usedApps: usage.map(storedUsageApp),
		violatingApps: selected.map(storedUsageApp),
		status: adherenceStatus(input.payload.timestamp, end, input.trackedPackages.size, milliseconds),
		sourceTimestamp: input.payload.timestamp
	};
}

function processSteps(state: LocalAppState, context: SyncContext, input: unknown) {
	const payload = parseHealthConnectPayload(input);
	const validDates = recentDates(payload.timestamp, context.timeZone);
	for (const sample of payload.steps) saveStepSample(state, context.timeZone, sample, validDates);
	state.steps.lastReceivedAt = payload.timestamp;
}

function saveStepSample(
	state: LocalAppState,
	timeZone: string,
	sample: StepsPayload['steps'][number],
	validDates: Set<string>
) {
	if (!isLocalDayStart(sample.start_time, timeZone)) throw new Error('Expected daily step data.');
	const date = localDateForInstant(sample.start_time, timeZone);
	if (!validDates.has(date)) return;
	const existing = state.steps.days.find((day) => day.date === date);
	if (existing && existing.sourceEndAt > sample.end_time) return;
	state.steps.days = [
		...state.steps.days.filter((day) => day.date !== date),
		{
			date,
			count: sample.count,
			sourceEndAt: sample.end_time
		}
	].sort(byDate);
}

function processScreenTime(state: LocalAppState, context: SyncContext, input: unknown) {
	const payload = parseScreenTimePayload(input);
	const validDates = recentDates(payload.timestamp, context.timeZone);
	for (const day of payload.screen_time)
		saveScreenTimeDay(state, day, payload.timestamp, validDates);
	state.screenTime.lastReceivedAt = payload.timestamp;
}

function saveScreenTimeDay(
	state: LocalAppState,
	day: ScreenTimePayload['screen_time'][number],
	sourceTimestamp: string,
	validDates: Set<string>
) {
	if (!validDates.has(day.date)) return;
	const existing = state.screenTime.days.find((item) => item.date === day.date);
	if (existing && existing.sourceTimestamp > sourceTimestamp) return;
	const snapshot = {
		date: day.date,
		totalMinutes: day.total_screen_time_minutes,
		apps: day.apps,
		sourceTimestamp
	};
	state.screenTime.days = [
		...state.screenTime.days.filter((item) => item.date !== day.date),
		snapshot
	].sort(byDate);
}

function processSleep(state: LocalAppState, context: SyncContext, input: unknown) {
	const payload = parseSleepPayload(input);
	const validDates = recentDates(payload.timestamp, context.timeZone);
	const trackedPackages = new Set(state.screenTime.trackedPackages);
	for (const date of payload.dates) {
		if (!validDates.has(date)) throw new Error('Sleep dates must be within the latest seven days.');
		const existing = state.sleep.days.find((day) => day.localDate === date);
		if (existing?.status !== 'pending' && existing) continue;
		const summary = calculateBedtimeAdherence({
			date,
			bedtime: state.sleep.bedtime,
			timeZone: context.timeZone,
			payload,
			trackedPackages
		});
		state.sleep.days = [...state.sleep.days.filter((day) => day.localDate !== date), summary].sort(
			byLocalDate
		);
	}
	state.sleep.lastReceivedAt = payload.timestamp;
}

function parseSleepPayload(input: unknown): SleepPayload {
	const payload = sleepPayloadSchema.parse(input);
	if (new Set(payload.dates).size !== payload.dates.length)
		throw new Error('Sleep dates must be unique.');
	if (payload.activity_intervals.some((interval) => interval.end_time <= interval.start_time)) {
		throw new Error('Sleep intervals must end after they start.');
	}
	return payload;
}

function bedtimeWindow(date: string, bedtime: string, timeZone: string) {
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute] = bedtime.split(':').map(Number);
	const start = toZoned(new CalendarDateTime(year, month, day, hour, minute), timeZone).toDate();
	return { start, end: new Date(start.getTime() + 4 * 60 * 60 * 1_000) };
}

function summarizeApps(intervals: SleepInterval[], start: Date, end: Date) {
	const apps = new Map<string, UsageApp>();
	for (const interval of intervals) addInterval(apps, interval, start, end);
	return [...apps.values()].sort((left, right) => right.seconds - left.seconds);
}

function addInterval(apps: Map<string, UsageApp>, interval: SleepInterval, start: Date, end: Date) {
	const milliseconds = overlapMilliseconds(interval, start, end);
	if (!milliseconds) return;
	const existing = apps.get(interval.package);
	const total = (existing?.milliseconds ?? 0) + milliseconds;
	apps.set(interval.package, {
		package: interval.package,
		name: interval.name,
		seconds: Math.ceil(total / 1_000),
		milliseconds: total
	});
}

function overlapMilliseconds(interval: SleepInterval, start: Date, end: Date) {
	const overlapStart = Math.max(Date.parse(interval.start_time), start.getTime());
	const overlapEnd = Math.min(Date.parse(interval.end_time), end.getTime());
	return Math.max(0, overlapEnd - overlapStart);
}

function latestScreenActivity(events: string[], start: Date, end: Date) {
	const latest = events
		.map(Date.parse)
		.filter((instant) => instant >= start.getTime() && instant < end.getTime())
		.sort((left, right) => right - left)[0];
	return latest === undefined ? null : new Date(latest).toISOString();
}

function adherenceStatus(timestamp: string, end: Date, trackedCount: number, milliseconds: number) {
	if (!trackedCount || Date.parse(timestamp) < end.getTime()) return 'pending' as const;
	return milliseconds > 300_000 ? ('fail' as const) : ('pass' as const);
}

function storedUsageApp(app: UsageApp) {
	return { package: app.package, name: app.name, seconds: app.seconds };
}

function recentDates(timestamp: string, timeZone: string) {
	const today = localDateForInstant(timestamp, timeZone);
	return new Set(dateKeysEndingAt(today, 7));
}

function byDate(left: { date: string }, right: { date: string }) {
	return left.date.localeCompare(right.date);
}

function byLocalDate(left: { localDate: string }, right: { localDate: string }) {
	return left.localDate.localeCompare(right.localDate);
}
