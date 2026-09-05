import { z } from 'zod';
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
	if (new Set(payload.screen_time.map((day) => day.date)).size !== payload.screen_time.length)
		throw new Error('Screen-time dates must be unique.');
	for (const day of payload.screen_time)
		if (new Set(day.apps.map((app) => app.package)).size !== day.apps.length)
			throw new Error(`App packages must be unique for ${day.date}.`);
	return payload;
}
