import type {
	NutritionEntry,
	NutritionIngredient,
	NutritionMeal,
	NutritionProfile,
	NutritionTotals
} from '$lib/app/model';
import { type ActivityLevel, calculateTdee } from './nutrition/model';

const EMPTY_TOTALS: NutritionTotals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 };
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export const MAX_NUTRITION_IMAGE_DATA_URL_LENGTH = 160 * 1024;

export function nutritionProfile(
	input: Record<string, unknown>,
	current?: NutritionProfile | null
) {
	const activityLevel = cleanActivityLevel(input.activityLevel ?? current?.activityLevel);
	const gender = cleanGender(input.gender ?? current?.gender);
	const weightKg = numberInRange(input.weightKg ?? current?.weightKg, 20, 300, 'weight');
	const heightCm = numberInRange(input.heightCm ?? current?.heightCm, 100, 250, 'height');
	const age = integerInRange(input.age ?? current?.age, 10, 120, 'age');
	const goalMode = cleanGoalMode(input.goalMode, current?.goalMode);
	const estimated = calculateTdee(weightKg, heightCm, age, gender, activityLevel);
	const dailyCalorieGoal =
		goalMode === 'custom'
			? integerInRange(input.customGoal ?? current?.dailyCalorieGoal, 500, 10_000, 'calorie goal')
			: estimated;
	return {
		weightKg,
		heightCm,
		age,
		gender,
		activityLevel,
		dailyCalorieGoal,
		goalMode,
		eatingWindowEnabled: booleanValue(input.eatingWindowEnabled ?? current?.eatingWindowEnabled),
		eatingWindowStart: validTime(input.eatingWindowStart ?? current?.eatingWindowStart ?? '12:00'),
		eatingWindowEnd: validTime(input.eatingWindowEnd ?? current?.eatingWindowEnd ?? '20:00')
	} satisfies NutritionProfile;
}

export function estimatedTdee(profile: NutritionProfile | null) {
	if (!profile) return null;
	return calculateTdee(
		profile.weightKg,
		profile.heightCm,
		profile.age,
		profile.gender,
		profile.activityLevel
	);
}

export function createNutritionEntry(input: {
	date: string;
	name?: unknown;
	notes?: unknown;
	createdAt?: string;
	meals: unknown[];
}) {
	const meals = validMeals(input.meals);
	return withEntryTotals({
		id: crypto.randomUUID(),
		date: input.date,
		name: cleanText(input.name, meals[0]?.name ?? 'Food entry', 120),
		notes: cleanText(input.notes, '', 500),
		createdAt: input.createdAt ?? new Date().toISOString(),
		thumbnail: '',
		meals,
		totals: EMPTY_TOTALS
	});
}

export function replaceNutritionEntry(entry: NutritionEntry, input: Record<string, unknown>) {
	const meals = Array.isArray(input.meals) ? validMeals(input.meals) : entry.meals;
	return withEntryTotals({
		...entry,
		date: String(input.date ?? entry.date),
		name: cleanText(input.name, entry.name, 120),
		notes: cleanText(input.notes, entry.notes, 500),
		createdAt: nutritionDateTime(
			String(input.date),
			String(input.time),
			Number(input.timeZoneOffset)
		),
		meals
	});
}

export function sumEntries(entries: NutritionEntry[]) {
	return roundTotals(
		entries.reduce((total, entry) => addTotals(total, entry.totals), EMPTY_TOTALS)
	);
}

function normalizeMeal(input: unknown): NutritionMeal {
	const meal = asRecord(input);
	const ingredients = Array.isArray(meal.ingredients)
		? meal.ingredients
				.slice(0, 40)
				.map(normalizeIngredient)
				.filter(({ name }) => name)
		: [];
	return {
		id: typeof meal.id === 'string' && meal.id ? meal.id : crypto.randomUUID(),
		name: cleanText(meal.name, 'Meal', 120),
		imageDataUrl: cleanImageDataUrl(meal.imageDataUrl),
		ingredients,
		totals: totalsFromIngredients(ingredients)
	};
}

function normalizeIngredient(input: unknown): NutritionIngredient {
	const ingredient = asRecord(input);
	return {
		id: typeof ingredient.id === 'string' && ingredient.id ? ingredient.id : crypto.randomUUID(),
		name: cleanText(ingredient.name, '', 120),
		quantity: cleanNumber(ingredient.quantity, 1, 100_000),
		unit: cleanText(ingredient.unit, 'serving', 40),
		calories: cleanNumber(ingredient.calories, 0, 100_000),
		proteinG: cleanNumber(ingredient.proteinG, 0, 10_000),
		carbsG: cleanNumber(ingredient.carbsG, 0, 10_000),
		fatG: cleanNumber(ingredient.fatG, 0, 10_000),
		notes: cleanText(ingredient.notes, '', 500)
	};
}

function withEntryTotals(entry: NutritionEntry) {
	return {
		...entry,
		thumbnail: '',
		totals: roundTotals(
			entry.meals.reduce((total, meal) => addTotals(total, meal.totals), EMPTY_TOTALS)
		)
	};
}

function totalsFromIngredients(ingredients: NutritionIngredient[]) {
	return roundTotals(
		ingredients.reduce(
			(total, ingredient) =>
				addTotals(total, {
					calories: ingredient.calories,
					proteinG: ingredient.proteinG,
					carbsG: ingredient.carbsG,
					fatG: ingredient.fatG,
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

export function nutritionDateTime(date: string, time: string, offset: number) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
		throw new Error('A valid date and time are required.');
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute] = time.split(':').map(Number);
	return new Date(Date.UTC(year, month - 1, day, hour, minute) + offset * 60_000).toISOString();
}

function cleanActivityLevel(value: unknown): ActivityLevel {
	if (ACTIVITY_LEVELS.includes(value as ActivityLevel)) return value as ActivityLevel;
	throw new Error('Choose a valid activity level.');
}

function cleanGender(value: unknown) {
	if (value === 'male' || value === 'female') return value;
	throw new Error('Choose a valid gender.');
}

function cleanGoalMode(value: unknown, current?: NutritionProfile['goalMode']) {
	if (value === 'estimated' || value === 'custom') return value;
	return current ?? 'estimated';
}

function validMeals(input: unknown[]) {
	const meals = input.slice(0, 30).map(normalizeMeal).filter(hasMealContent);
	if (!meals.some((meal) => meal.ingredients.length)) {
		throw new Error('Add at least one named ingredient.');
	}
	return meals;
}

function numberInRange(value: unknown, minimum: number, maximum: number, label: string) {
	const number = Number(value);
	if (!Number.isFinite(number) || number < minimum || number > maximum)
		throw new Error(`Enter a valid ${label}.`);
	return number;
}

function integerInRange(value: unknown, minimum: number, maximum: number, label: string) {
	const number = Number(value);
	if (!Number.isInteger(number) || number < minimum || number > maximum)
		throw new Error(`Enter a valid ${label}.`);
	return number;
}

function validTime(value: unknown) {
	const time = String(value);
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid eating window.');
	return time;
}

function booleanValue(value: unknown) {
	return value === true || value === 'true' || value === 'on' || value === '1';
}

function hasMealContent(meal: NutritionMeal) {
	return Boolean(meal.name || meal.ingredients.length);
}

function cleanText(value: unknown, fallback = '', maximum = 500) {
	return (String(value ?? '').trim() || fallback).slice(0, maximum);
}

function cleanNumber(value: unknown, fallback: number, maximum: number) {
	const number = Number(value);
	return Number.isFinite(number)
		? Math.max(0, Math.min(maximum, Math.round(number * 10) / 10))
		: fallback;
}

function cleanImageDataUrl(value: unknown) {
	if (typeof value !== 'string' || value.length > MAX_NUTRITION_IMAGE_DATA_URL_LENGTH) return '';
	return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : '';
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
