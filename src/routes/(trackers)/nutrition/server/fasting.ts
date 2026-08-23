import { and, asc, eq, inArray } from 'drizzle-orm';

import type { Database } from '$lib/server/db';
import { nutritionEntry, nutritionFastingDay } from '$lib/server/db/schema';
import { validDate } from './nutrition';

export const MAX_CONSECUTIVE_FASTING_DAYS = 30;

export class NutritionFastingConflictError extends Error {}
export class NutritionFastingInputError extends Error {}

export function consecutiveFastingDates(date: unknown, days: unknown, today: string) {
	if (!validDate(date) || date > today) {
		throw new NutritionFastingInputError('Choose a valid start date that is not in the future.');
	}
	if (
		typeof days !== 'number' ||
		!Number.isInteger(days) ||
		days < 1 ||
		days > MAX_CONSECUTIVE_FASTING_DAYS
	) {
		throw new NutritionFastingInputError(
			`Choose between 1 and ${MAX_CONSECUTIVE_FASTING_DAYS} fasting days.`
		);
	}
	const dates = Array.from({ length: days }, (_, offset) => addUtcDays(date, offset));
	if (dates.at(-1)! > today) {
		throw new NutritionFastingInputError('Fasting days cannot be marked in the future.');
	}
	return dates;
}

export async function markFastingDays(
	db: Database,
	userId: string,
	date: unknown,
	days: unknown,
	today: string
) {
	const dates = consecutiveFastingDates(date, days, today);
	const [entries, fastingDays] = await db.batch([
		db
			.select({ date: nutritionEntry.date })
			.from(nutritionEntry)
			.where(and(eq(nutritionEntry.userId, userId), inArray(nutritionEntry.date, dates)))
			.orderBy(asc(nutritionEntry.date)),
		db
			.select({ date: nutritionFastingDay.date })
			.from(nutritionFastingDay)
			.where(and(eq(nutritionFastingDay.userId, userId), inArray(nutritionFastingDay.date, dates)))
			.orderBy(asc(nutritionFastingDay.date))
	]);
	if (entries[0]) throw fastingConflict(`${entries[0].date} already has a meal logged.`);
	if (fastingDays[0]) throw fastingConflict(`${fastingDays[0].date} is already marked as fasting.`);
	try {
		await db
			.insert(nutritionFastingDay)
			.values(dates.map((fastingDate) => ({ userId, date: fastingDate })));
	} catch (cause) {
		if (isFastingDatabaseConflict(cause)) throw fastingConflict('One or more days now conflict.');
		throw cause;
	}
	return dates;
}

export async function cancelFastingDay(db: Database, userId: string, date: string) {
	const deleted = await db
		.delete(nutritionFastingDay)
		.where(and(eq(nutritionFastingDay.userId, userId), eq(nutritionFastingDay.date, date)))
		.returning({ date: nutritionFastingDay.date });
	return deleted[0] ?? null;
}

export async function getFastingDay(db: Database, userId: string, date: string) {
	const [fastingDay] = await db
		.select()
		.from(nutritionFastingDay)
		.where(and(eq(nutritionFastingDay.userId, userId), eq(nutritionFastingDay.date, date)))
		.limit(1);
	return fastingDay ?? null;
}

export async function assertMealsAllowed(db: Database, userId: string, date: string) {
	if (await getFastingDay(db, userId, date)) {
		throw fastingConflict('Cancel the full-day fast before adding a meal.');
	}
}

export function isNutritionFastingConflict(cause: unknown) {
	return cause instanceof NutritionFastingConflictError || isFastingDatabaseConflict(cause);
}

function fastingConflict(message: string) {
	return new NutritionFastingConflictError(message);
}

function isFastingDatabaseConflict(cause: unknown) {
	const message = cause instanceof Error ? cause.message : String(cause);
	return (
		message.includes('nutrition day is fasting') ||
		message.includes('nutrition fasting day has meals') ||
		message.includes('UNIQUE constraint failed: nutrition_fasting_day')
	);
}

function addUtcDays(date: string, days: number) {
	const value = new Date(`${date}T00:00:00Z`);
	value.setUTCDate(value.getUTCDate() + days);
	return value.toISOString().slice(0, 10);
}
