import { error, json } from '@sveltejs/kit';

import { requireDb } from '$lib/server/guards';
import { toIngredientInputs, validateMealEstimate } from '../../server/meal-analysis';
import { parseMealSource } from '../../server/meal-source';
import { assertMealsAllowed, isNutritionFastingConflict } from '../../server/fasting';
import {
	addMeal,
	createEntry,
	deleteEntry,
	finalizeEntry,
	validDate
} from '../../server/nutrition';
import { todayIso } from '$lib/utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid JSON body.');

	const date = typeof body.date === 'string' ? body.date : '';
	if (!validDate(date) || date > todayIso())
		error(400, 'Choose a valid date that is not in the future.');

	let source: ReturnType<typeof parseMealSource>;
	let analysis: ReturnType<typeof validateMealEstimate>;
	try {
		source = parseMealSource(body.image, body.description);
		analysis = validateMealEstimate(body.estimate);
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'The meal estimate is invalid.');
	}

	const db = requireDb(locals);
	try {
		await assertMealsAllowed(db, locals.user.id, date);
	} catch (cause) {
		if (isNutritionFastingConflict(cause)) {
			error(409, cause instanceof Error ? cause.message : 'This is a fasting day.');
		}
		throw cause;
	}

	let entryId = '';
	try {
		const createdEntry = await createEntry(db, locals.user.id, {
			date,
			name: analysis.mealName
		});
		if (!createdEntry) throw new Error('Could not create the meal.');
		entryId = createdEntry.id;

		const meal = await addMeal(db, entryId, {
			name: analysis.mealName,
			imageDataUrl: source.image?.dataUrl ?? '',
			ingredients: toIngredientInputs(analysis)
		});
		if (!meal) throw new Error('Could not save the meal.');

		await finalizeEntry(db, entryId, locals.user.id);
		return json({ entry: { ...createdEntry, name: analysis.mealName }, meal }, { status: 201 });
	} catch (cause) {
		if (entryId) await deleteEntry(db, entryId, locals.user.id).catch(() => undefined);
		if (isNutritionFastingConflict(cause)) {
			error(409, 'Cancel the full-day fast before adding a meal.');
		}
		error(500, cause instanceof Error ? cause.message : 'Could not save the meal.');
	}
};
