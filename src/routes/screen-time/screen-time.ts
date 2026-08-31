import { z } from 'zod';

export const SCREEN_TIME_TOKEN_HEADER = 'X-Screen-Time-Token';
export const MAX_SCREEN_TIME_DAYS = 7;
export const MAX_APPS_PER_DAY = 100;
export const MAX_DAILY_MINUTES = 1_440;
const shortString = z.string().trim().min(1).max(120);
const instantSchema = z.iso.datetime();
const appSchema = z.object({
	package: z.string().trim().min(1).max(255),
	name: shortString,
	minutes: z.number().int().min(0).max(MAX_DAILY_MINUTES),
	last_used: instantSchema
});
const daySchema = z.object({
	date: z.iso.date(),
	total_screen_time_minutes: z.number().int().min(0).max(MAX_DAILY_MINUTES),
	apps: z.array(appSchema).max(MAX_APPS_PER_DAY)
});
const payloadSchema = z.object({
	timestamp: instantSchema,
	app_version: z.string().trim().min(1).max(40),
	device: shortString.optional(),
	source: z.literal('screen_time').optional(),
	screen_time: z.array(daySchema).max(MAX_SCREEN_TIME_DAYS)
});

export type ScreenTimePayload = z.infer<typeof payloadSchema>;
export type ScreenTimeApp = ScreenTimePayload['screen_time'][number]['apps'][number];
export type ScreenTimeDay = ScreenTimePayload['screen_time'][number];

export function parseScreenTimePayload(input: unknown) {
	const payload = payloadSchema.parse(input);
	assertUniqueDates(payload.screen_time);
	for (const day of payload.screen_time) assertUniqueApps(day);
	return payload;
}

export function hasTrackedApps(apps: Array<{ tracked: boolean }>) {
	return apps.some((app) => app.tracked);
}

export function formatScreenTime(minutes: number) {
	const wholeMinutes = Math.max(0, Math.round(minutes));
	const hours = Math.floor(wholeMinutes / 60);
	const remainingMinutes = wholeMinutes % 60;
	if (!hours) return `${remainingMinutes}m`;
	if (!remainingMinutes) return `${hours}h`;
	return `${hours}h ${remainingMinutes}m`;
}

export function summarizeUsage(days: Array<{ totalMinutes: number }>) {
	const totalMinutes = days.reduce((total, day) => total + day.totalMinutes, 0);
	return {
		totalMinutes,
		averageMinutes: days.length ? Math.round(totalMinutes / days.length) : 0,
		maxMinutes: Math.max(1, ...days.map((day) => day.totalMinutes))
	};
}

export function topApps(apps: ScreenTimeApp[], limit = 8) {
	return [...apps].sort((left, right) => right.minutes - left.minutes).slice(0, limit);
}

function assertUniqueDates(days: ScreenTimeDay[]) {
	if (new Set(days.map((day) => day.date)).size !== days.length) {
		throw new Error('Screen-time dates must be unique.');
	}
}

function assertUniqueApps(day: ScreenTimeDay) {
	const packages = day.apps.map((app) => app.package);
	if (new Set(packages).size !== packages.length) {
		throw new Error(`App packages must be unique for ${day.date}.`);
	}
}
