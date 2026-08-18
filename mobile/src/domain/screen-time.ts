import type { LocalDayRange } from './day-ranges';
import { validationFailure } from './errors';
import { payloadAppVersion, payloadTimestamp } from './payload-validation';
import type { ScreenTimePayload } from './payloads';

export const APP_PACKAGE = 'com.zuncreative.selfimprovement';
const MAX_APPS = 100;
const MAX_MINUTES = 1_440;
const MAX_PACKAGE_LENGTH = 255;
const MAX_LABEL_LENGTH = 120;
const MILLISECONDS_PER_MINUTE = 60_000;

export type NativeUsageStats = {
	packageName: string;
	totalTimeInForeground: number;
	lastTimeUsed: number;
};

export type NativeUsageDay = {
	range: LocalDayRange;
	stats: Record<string, NativeUsageStats>;
};

type ScreenTimeApp = ScreenTimePayload['screen_time'][number]['apps'][number];

export function buildScreenTimePayload(
	days: NativeUsageDay[],
	timestamp: Date,
	appVersion: string
): ScreenTimePayload {
	validateDays(days);
	return {
		timestamp: payloadTimestamp(timestamp),
		app_version: payloadAppVersion(appVersion),
		source: 'screen_time',
		screen_time: [...days].sort(byDate).map(toScreenTimeDay)
	};
}

function toScreenTimeDay(day: NativeUsageDay) {
	const apps = mergeApps(Object.values(day.stats)).sort(compareApps);
	return {
		date: day.range.date,
		total_screen_time_minutes: totalMinutes(apps),
		apps: apps.slice(0, MAX_APPS)
	};
}

function mergeApps(stats: NativeUsageStats[]) {
	const apps = new Map<string, ScreenTimeApp>();
	for (const usage of stats) mergeApp(apps, usage);
	return [...apps.values()];
}

function mergeApp(apps: Map<string, ScreenTimeApp>, usage: NativeUsageStats) {
	const app = toScreenTimeApp(usage);
	if (!app) return;
	const existing = apps.get(app.package);
	apps.set(app.package, existing ? combineUsage(existing, app) : app);
}

function toScreenTimeApp(usage: NativeUsageStats): ScreenTimeApp | undefined {
	const packageName = validPackageName(usage.packageName);
	if (packageName === APP_PACKAGE) return;
	const minutes = foregroundMinutes(usage.totalTimeInForeground);
	if (!minutes) return;
	return {
		package: packageName,
		name: fallbackLabel(packageName),
		minutes,
		last_used: lastUsedInstant(usage.lastTimeUsed)
	};
}

function combineUsage(left: ScreenTimeApp, right: ScreenTimeApp): ScreenTimeApp {
	return {
		...left,
		minutes: validMinutes(left.minutes + right.minutes),
		last_used: left.last_used > right.last_used ? left.last_used : right.last_used
	};
}

function foregroundMinutes(milliseconds: number) {
	if (!Number.isFinite(milliseconds) || milliseconds < 0) throw validationFailure();
	return validMinutes(Math.round(milliseconds / MILLISECONDS_PER_MINUTE));
}

function totalMinutes(apps: ScreenTimeApp[]) {
	return validMinutes(apps.reduce((total, app) => total + app.minutes, 0));
}

function validMinutes(minutes: number) {
	if (!Number.isSafeInteger(minutes) || minutes < 0 || minutes > MAX_MINUTES) {
		throw validationFailure();
	}
	return minutes;
}

function lastUsedInstant(milliseconds: number) {
	if (!Number.isFinite(milliseconds) || milliseconds < 0) throw validationFailure();
	const instant = new Date(milliseconds);
	if (!Number.isFinite(instant.getTime())) throw validationFailure();
	return instant.toISOString();
}

function validPackageName(value: string) {
	const packageName = value.trim();
	if (!packageName || packageName.length > MAX_PACKAGE_LENGTH) throw validationFailure();
	return packageName;
}

function fallbackLabel(packageName: string) {
	return packageName.slice(0, MAX_LABEL_LENGTH);
}

function compareApps(left: ScreenTimeApp, right: ScreenTimeApp) {
	if (left.minutes !== right.minutes) return right.minutes - left.minutes;
	return left.package < right.package ? -1 : left.package > right.package ? 1 : 0;
}

function validateDays(days: NativeUsageDay[]) {
	if (days.length > 7) throw validationFailure();
	if (new Set(days.map(({ range }) => range.date)).size !== days.length) throw validationFailure();
}

function byDate(left: NativeUsageDay, right: NativeUsageDay) {
	return left.range.date < right.range.date ? -1 : left.range.date > right.range.date ? 1 : 0;
}
