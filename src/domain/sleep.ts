import type { LocalDayRange } from './day-ranges';
import { validationFailure } from './errors';
import { APP_PACKAGE } from './screen-time';
import { normalizedInstant, payloadAppVersion, payloadTimestamp } from './payload-validation';
import type { SleepPayload } from './payloads';

const MAX_INTERVALS = 5_000;
const MAX_SCREEN_EVENTS = 2_000;
const MAX_PACKAGE_LENGTH = 255;
const MAX_LABEL_LENGTH = 120;

export type NativeActivityInterval = {
	packageName: string;
	startTime: number;
	endTime: number;
};

export type NativeUsageEvents = {
	activityIntervals: NativeActivityInterval[];
	screenInteractive: number[];
	appLabels?: Record<string, string>;
};

export function buildSleepPayload(
	events: NativeUsageEvents,
	days: LocalDayRange[],
	timestamp: Date,
	appVersion: string
): SleepPayload {
	validateDays(days);
	if (events.activityIntervals.length > MAX_INTERVALS) {
		throw validationFailure('Too many app activity intervals to sync.');
	}
	if (events.screenInteractive.length > MAX_SCREEN_EVENTS) {
		throw validationFailure('Too many screen activity events to sync.');
	}
	return {
		timestamp: payloadTimestamp(timestamp),
		app_version: payloadAppVersion(appVersion),
		source: 'usage_events',
		dates: days.map(({ date }) => date),
		activity_intervals: events.activityIntervals.flatMap((interval) =>
			interval.packageName === APP_PACKAGE ? [] : [toActivityInterval(interval, events.appLabels)]
		),
		screen_interactive: events.screenInteractive.map(toInstant)
	};
}

function toActivityInterval(
	interval: NativeActivityInterval,
	appLabels?: Record<string, string>
): SleepPayload['activity_intervals'][number] {
	const packageName = validPackageName(interval.packageName);
	if (!Number.isFinite(interval.startTime) || !Number.isFinite(interval.endTime)) {
		throw validationFailure();
	}
	if (interval.endTime <= interval.startTime) throw validationFailure();
	return {
		package: packageName,
		name: appLabel(packageName, appLabels),
		start_time: toInstant(interval.startTime),
		end_time: toInstant(interval.endTime)
	};
}

function toInstant(milliseconds: number) {
	if (!Number.isFinite(milliseconds) || milliseconds < 0) throw validationFailure();
	return normalizedInstant(new Date(milliseconds).toISOString());
}

function validPackageName(value: string) {
	const packageName = value.trim();
	if (!packageName || packageName.length > MAX_PACKAGE_LENGTH) throw validationFailure();
	return packageName;
}

function appLabel(packageName: string, appLabels?: Record<string, string>) {
	return (
		appLabels?.[packageName]?.trim().slice(0, MAX_LABEL_LENGTH) ||
		packageName.slice(0, MAX_LABEL_LENGTH)
	);
}

function validateDays(days: LocalDayRange[]) {
	if (!days.length || days.length > 7) throw validationFailure();
	if (new Set(days.map(({ date }) => date)).size !== days.length) throw validationFailure();
}
