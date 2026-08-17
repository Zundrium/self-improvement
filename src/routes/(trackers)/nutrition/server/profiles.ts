import { eq } from 'drizzle-orm';

import type { Database } from '$lib/server/db';
import { nutritionProfile } from '$lib/server/db/schema';
import { calculateTdee, type ActivityLevel } from '../nutrition';

const ACTIVITY_LEVELS: ActivityLevel[] = [
	'sedentary',
	'light',
	'moderate',
	'active',
	'very_active'
];

type ProfileInput = {
	weightKg: number;
	heightCm: number;
	age: number;
	gender: 'male' | 'female';
	activityLevel: ActivityLevel;
	goalMode: 'estimated' | 'custom';
	customGoal?: number;
};

export async function getProfile(db: Database, userId: string) {
	const [result] = await db
		.select()
		.from(nutritionProfile)
		.where(eq(nutritionProfile.userId, userId))
		.limit(1);
	return result ?? null;
}

export async function saveProfile(db: Database, userId: string, input: ProfileInput) {
	const validated = validateProfileInput(input);
	const estimatedGoal = calculateTdee(
		validated.weightKg,
		validated.heightCm,
		validated.age,
		validated.gender,
		validated.activityLevel
	);
	const dailyCalorieGoal =
		validated.goalMode === 'custom' ? (validated.customGoal ?? estimatedGoal) : estimatedGoal;
	const values = {
		userId,
		weightKg: validated.weightKg,
		heightCm: validated.heightCm,
		age: validated.age,
		gender: validated.gender,
		activityLevel: validated.activityLevel,
		dailyCalorieGoal,
		goalMode: validated.goalMode,
		updatedAt: new Date()
	};

	await db
		.insert(nutritionProfile)
		.values(values)
		.onConflictDoUpdate({
			target: nutritionProfile.userId,
			set: {
				weightKg: values.weightKg,
				heightCm: values.heightCm,
				age: values.age,
				gender: values.gender,
				activityLevel: values.activityLevel,
				dailyCalorieGoal: values.dailyCalorieGoal,
				goalMode: values.goalMode,
				updatedAt: values.updatedAt
			}
		});

	return getProfile(db, userId);
}

export function estimatedTdee(value: Awaited<ReturnType<typeof getProfile>>) {
	if (!value) return null;
	return calculateTdee(
		value.weightKg,
		value.heightCm,
		value.age,
		value.gender,
		value.activityLevel
	);
}

export function profileInputFromForm(form: FormData): ProfileInput {
	const weightKg = Number(form.get('weightKg'));
	const heightCm = Number(form.get('heightCm'));
	const age = Number(form.get('age'));
	const gender =
		form.get('gender') === 'female' ? 'female' : form.get('gender') === 'male' ? 'male' : null;
	const activityValue = String(form.get('activityLevel') ?? 'sedentary');
	const activityLevel = ACTIVITY_LEVELS.includes(activityValue as ActivityLevel)
		? (activityValue as ActivityLevel)
		: null;
	const goalMode = form.get('goalMode') === 'custom' ? 'custom' : 'estimated';
	const customGoal = Number(form.get('customGoal'));

	if (!gender || !activityLevel) throw new Error('Choose a valid gender and activity level.');
	return { weightKg, heightCm, age, gender, activityLevel, goalMode, customGoal };
}

function validateProfileInput(input: ProfileInput): ProfileInput {
	if (!Number.isFinite(input.weightKg) || input.weightKg < 20 || input.weightKg > 300) {
		throw new Error('Enter a weight between 20 and 300 kg.');
	}
	if (!Number.isFinite(input.heightCm) || input.heightCm < 100 || input.heightCm > 250) {
		throw new Error('Enter a height between 100 and 250 cm.');
	}
	if (!Number.isInteger(input.age) || input.age < 10 || input.age > 120) {
		throw new Error('Enter an age between 10 and 120.');
	}
	if (input.goalMode === 'custom') {
		if (
			!Number.isFinite(input.customGoal) ||
			(input.customGoal ?? 0) < 500 ||
			(input.customGoal ?? 0) > 10_000
		) {
			throw new Error('Enter a calorie goal between 500 and 10,000 kcal.');
		}
	}
	return input;
}
