import { and, asc, count, eq, gte, inArray, lte } from 'drizzle-orm';

import type { Database } from '$lib/server/db';
import {
	nutritionEntry as entry,
	nutritionIngredient as ingredient,
	nutritionMeal as meal,
	type NutritionEntry as Entry,
	type NutritionIngredient as Ingredient,
	type NutritionMeal as Meal
} from '$lib/server/db/schema';

export type IngredientInput = {
	name: string;
	quantity?: number;
	unit?: string;
	calories?: number;
	proteinG?: number;
	carbsG?: number;
	fatG?: number;
	notes?: string;
};

export type MealInput = {
	name?: string;
	imageDataUrl?: string;
	ingredients?: IngredientInput[];
};

export type NutritionTotals = {
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	count: number;
};

export type MealWithIngredients = Meal & {
	ingredients: Ingredient[];
	totals: NutritionTotals;
};

export type EntryWithMeals = Entry & {
	meals: MealWithIngredients[];
	totals: NutritionTotals;
	thumbnail: string;
};

const EMPTY_TOTALS: NutritionTotals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 };

export async function createEntry(
	db: Database,
	userId: string,
	input: { date?: string; name?: string; notes?: string }
) {
	const id = crypto.randomUUID();
	const date = validDate(input.date) ? input.date : new Date().toISOString().slice(0, 10);
	await db.insert(entry).values({
		id,
		userId,
		date,
		name: cleanText(input.name, 'Food entry', 120),
		notes: cleanText(input.notes, '', 500)
	});
	return getOwnedEntry(db, id, userId);
}

export async function getOwnedEntry(db: Database, entryId: string, userId: string) {
	const [result] = await db
		.select()
		.from(entry)
		.where(and(eq(entry.id, entryId), eq(entry.userId, userId)))
		.limit(1);
	return result ?? null;
}

export async function deleteEntry(db: Database, entryId: string, userId: string) {
	await db.delete(entry).where(and(eq(entry.id, entryId), eq(entry.userId, userId)));
}

export async function finalizeEntry(db: Database, entryId: string, userId: string) {
	await db
		.update(entry)
		.set({ finalizedAt: new Date(), updatedAt: new Date() })
		.where(and(eq(entry.id, entryId), eq(entry.userId, userId)));
}

export async function addMeal(db: Database, entryId: string, input: MealInput) {
	const [{ value: mealCount }] = await db
		.select({ value: count() })
		.from(meal)
		.where(eq(meal.entryId, entryId));
	return insertMeal(db, entryId, mealCount, input);
}

export async function replaceEntry(
	db: Database,
	entryId: string,
	userId: string,
	input: { date: string; createdAt: Date; name?: string; notes?: string; meals: MealInput[] }
) {
	if (!validDate(input.date)) throw new Error('A valid date is required.');
	const ownedEntry = await getOwnedEntry(db, entryId, userId);
	if (!ownedEntry) return null;

	await db
		.update(entry)
		.set({
			date: input.date,
			createdAt: input.createdAt,
			name: cleanText(input.name, 'Food entry', 120),
			notes: cleanText(input.notes, '', 500),
			updatedAt: new Date()
		})
		.where(eq(entry.id, entryId));

	await db.delete(meal).where(eq(meal.entryId, entryId));
	for (const [index, mealInput] of input.meals.slice(0, 30).entries()) {
		const ingredients = (mealInput.ingredients ?? []).filter((item) => cleanText(item.name));
		if (!cleanText(mealInput.name) && ingredients.length === 0) continue;
		await insertMeal(db, entryId, index, { ...mealInput, ingredients });
	}

	return getEntryWithMeals(db, entryId, userId);
}

export async function getEntryWithMeals(db: Database, entryId: string, userId: string) {
	const ownedEntry = await getOwnedEntry(db, entryId, userId);
	if (!ownedEntry) return null;
	const meals = await getMeals(db, [entryId]);
	return assembleEntry(ownedEntry, meals);
}

export async function getDailyEntries(db: Database, userId: string, date: string) {
	const [entries, mealRows, ingredientRows] = await db.batch([
		dailyEntriesQuery(db, userId, date),
		dailyMealsQuery(db, userId, date),
		dailyIngredientsQuery(db, userId, date)
	]);
	const meals = assembleMeals(
		mealRows.map((row) => row.meal),
		ingredientRows.map((row) => row.ingredient)
	);
	return entries.map((item) => assembleEntry(item, meals));
}

function dailyEntriesQuery(db: Database, userId: string, date: string) {
	return db
		.select()
		.from(entry)
		.where(and(eq(entry.userId, userId), eq(entry.date, date)))
		.orderBy(asc(entry.createdAt));
}

function dailyMealsQuery(db: Database, userId: string, date: string) {
	return db
		.select({ meal })
		.from(meal)
		.innerJoin(entry, eq(meal.entryId, entry.id))
		.where(and(eq(entry.userId, userId), eq(entry.date, date)))
		.orderBy(asc(meal.sortOrder), asc(meal.createdAt));
}

function dailyIngredientsQuery(db: Database, userId: string, date: string) {
	return db
		.select({ ingredient })
		.from(ingredient)
		.innerJoin(meal, eq(ingredient.mealId, meal.id))
		.innerJoin(entry, eq(meal.entryId, entry.id))
		.where(and(eq(entry.userId, userId), eq(entry.date, date)))
		.orderBy(asc(ingredient.sortOrder), asc(ingredient.createdAt));
}

export async function getTrackedDates(
	db: Database,
	userId: string,
	startDate: string,
	endDate: string
) {
	const rows = await db
		.selectDistinct({ date: entry.date })
		.from(entry)
		.where(and(eq(entry.userId, userId), gte(entry.date, startDate), lte(entry.date, endDate)))
		.orderBy(asc(entry.date));
	return rows.map((row) => row.date);
}

export function sumEntryTotals(entries: EntryWithMeals[]) {
	return roundTotals(entries.reduce((total, item) => addTotals(total, item.totals), EMPTY_TOTALS));
}

export function safeImageDataUrl(value: unknown): string {
	const raw = typeof value === 'string' ? value : '';
	const supported =
		raw.startsWith('data:image/jpeg;base64,') ||
		raw.startsWith('data:image/png;base64,') ||
		raw.startsWith('data:image/webp;base64,');
	return supported && raw.length <= 768 * 1024 ? raw : '';
}

export function validDate(value: unknown): value is string {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function localDateTime(date: string, time: string, timeZoneOffset: number) {
	if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
		throw new Error('A valid date and time are required.');
	}
	if (!Number.isInteger(timeZoneOffset) || Math.abs(timeZoneOffset) > 14 * 60) {
		throw new Error('A valid time zone is required.');
	}
	const [year, month, day] = date.split('-').map(Number);
	const [hours, minutes] = time.split(':').map(Number);
	return new Date(Date.UTC(year, month - 1, day, hours, minutes) + timeZoneOffset * 60_000);
}

async function insertMeal(db: Database, entryId: string, sortOrder: number, input: MealInput) {
	const mealId = crypto.randomUUID();
	await db.insert(meal).values({
		id: mealId,
		entryId,
		name: cleanText(input.name, 'Meal', 120),
		imageDataUrl: safeImageDataUrl(input.imageDataUrl),
		sortOrder
	});

	const ingredients = (input.ingredients ?? [])
		.slice(0, 40)
		.map((item, index) => normalizeIngredient(item, `Ingredient ${index + 1}`))
		.filter((item) => item.name);
	if (ingredients.length > 0) {
		await db.insert(ingredient).values(
			ingredients.map((item, index) => ({
				id: crypto.randomUUID(),
				mealId,
				...item,
				sortOrder: index
			}))
		);
	}

	const meals = await getMeals(db, [entryId]);
	return meals.find((item) => item.id === mealId) ?? null;
}

async function getMeals(db: Database, entryIds: string[]): Promise<MealWithIngredients[]> {
	if (entryIds.length === 0) return [];
	const meals = await db
		.select()
		.from(meal)
		.where(inArray(meal.entryId, entryIds))
		.orderBy(asc(meal.sortOrder), asc(meal.createdAt));
	if (meals.length === 0) return [];
	const ingredients = await db
		.select()
		.from(ingredient)
		.where(
			inArray(
				ingredient.mealId,
				meals.map((item) => item.id)
			)
		)
		.orderBy(asc(ingredient.sortOrder), asc(ingredient.createdAt));
	return assembleMeals(meals, ingredients);
}

function assembleMeals(meals: Meal[], ingredients: Ingredient[]): MealWithIngredients[] {
	const byMeal = new Map<string, Ingredient[]>();
	for (const item of ingredients)
		byMeal.set(item.mealId, [...(byMeal.get(item.mealId) ?? []), item]);
	return meals.map((item) => mealWithIngredients(item, byMeal.get(item.id) ?? []));
}

function mealWithIngredients(item: Meal, ingredients: Ingredient[]): MealWithIngredients {
	return { ...item, ingredients, totals: totalsFromIngredients(ingredients) };
}

function assembleEntry(item: Entry, meals: MealWithIngredients[]): EntryWithMeals {
	const entryMeals = meals.filter((mealItem) => mealItem.entryId === item.id);
	return {
		...item,
		meals: entryMeals,
		totals: roundTotals(
			entryMeals.reduce((total, mealItem) => addTotals(total, mealItem.totals), EMPTY_TOTALS)
		),
		thumbnail: entryMeals.find((mealItem) => mealItem.imageDataUrl)?.imageDataUrl ?? ''
	};
}

function normalizeIngredient(input: IngredientInput, fallbackName: string) {
	return {
		name: cleanText(input.name, fallbackName, 120),
		quantity: cleanNumber(input.quantity, 1, 100_000),
		unit: cleanText(input.unit, 'serving', 40),
		calories: cleanNumber(input.calories, 0, 100_000),
		proteinG: cleanNumber(input.proteinG, 0, 10_000),
		carbsG: cleanNumber(input.carbsG, 0, 10_000),
		fatG: cleanNumber(input.fatG, 0, 10_000),
		notes: cleanText(input.notes, '', 500)
	};
}

function totalsFromIngredients(items: Ingredient[]): NutritionTotals {
	return roundTotals(
		items.reduce(
			(total, item) =>
				addTotals(total, {
					calories: item.calories,
					proteinG: item.proteinG,
					carbsG: item.carbsG,
					fatG: item.fatG,
					count: 1
				}),
			EMPTY_TOTALS
		)
	);
}

function addTotals(left: NutritionTotals, right: NutritionTotals): NutritionTotals {
	return {
		calories: left.calories + right.calories,
		proteinG: left.proteinG + right.proteinG,
		carbsG: left.carbsG + right.carbsG,
		fatG: left.fatG + right.fatG,
		count: left.count + right.count
	};
}

function roundTotals(total: NutritionTotals): NutritionTotals {
	return {
		calories: Math.round(total.calories),
		proteinG: Math.round(total.proteinG * 10) / 10,
		carbsG: Math.round(total.carbsG * 10) / 10,
		fatG: Math.round(total.fatG * 10) / 10,
		count: total.count
	};
}

function cleanText(value: unknown, fallback = '', max = 500): string {
	const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
	return (text || fallback).slice(0, max);
}

function cleanNumber(value: unknown, fallback: number, max: number): number {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	return Math.max(0, Math.min(max, Math.round(numeric * 10) / 10));
}
