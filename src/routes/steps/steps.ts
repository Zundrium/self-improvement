import { z } from 'zod';

export const DEFAULT_STEP_GOAL = 5_000;
export const STEP_TOKEN_HEADER = 'X-Steps-Token';

const instantSchema = z.iso.datetime();
const metadataSchema = z
	.object({
		data_origin: z.string().trim().max(255).optional()
	})
	.passthrough();
const stepSchema = z.object({
	count: z.number().int().min(0).max(1_000_000),
	start_time: instantSchema,
	end_time: instantSchema,
	metadata: metadataSchema.optional()
});
const payloadSchema = z
	.object({
		timestamp: instantSchema,
		app_version: z.string().trim().min(1).max(40),
		steps: z.array(stepSchema).max(400).optional().default([])
	})
	.passthrough();

export type HealthConnectPayload = z.infer<typeof payloadSchema>;
export type HealthConnectStep = HealthConnectPayload['steps'][number];

export function parseHealthConnectPayload(input: unknown) {
	const payload = payloadSchema.parse(input);
	if (payload.steps.some((step) => Date.parse(step.end_time) < Date.parse(step.start_time))) {
		throw new Error('A step interval ends before it starts.');
	}
	return payload;
}

export function parseStepGoal(value: FormDataEntryValue | null) {
	const goal = Number(value);
	if (!Number.isInteger(goal) || goal < 1_000 || goal > 100_000) {
		throw new Error('Enter a daily goal between 1,000 and 100,000 steps.');
	}
	return goal;
}

export function isValidTimeZone(value: string) {
	try {
		new Intl.DateTimeFormat('en', { timeZone: value }).format();
		return value.length <= 100;
	} catch {
		return false;
	}
}

export function localDateForInstant(instant: string | Date, timeZone: string) {
	const date = typeof instant === 'string' ? new Date(instant) : instant;
	const parts = dateParts(date, timeZone);
	return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isLocalDayStart(instant: string, timeZone: string) {
	const parts = dateParts(new Date(instant), timeZone, true);
	return parts.hour === '00' && parts.minute === '00' && parts.second === '00';
}

export function isValidDateKey(value: string) {
	return z.iso.date().safeParse(value).success;
}

export function dateKeysEndingAt(endDateKey: string, total: number) {
	const [year, month, day] = endDateKey.split('-').map(Number);
	const end = new Date(Date.UTC(year, month - 1, day));
	return Array.from({ length: total }, (_, index) => dateKey(addDays(end, index - total + 1)));
}

function dateParts(date: Date, timeZone: string, includeTime = false) {
	const options: Intl.DateTimeFormatOptions = {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	};
	if (includeTime) Object.assign(options, timeOptions());
	return Object.fromEntries(
		new Intl.DateTimeFormat('en-GB', options)
			.formatToParts(date)
			.filter(({ type }) => type !== 'literal')
			.map(({ type, value }) => [type, value])
	);
}

function timeOptions(): Intl.DateTimeFormatOptions {
	return {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	};
}

function addDays(date: Date, days: number) {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

function dateKey(date: Date) {
	return date.toISOString().slice(0, 10);
}
