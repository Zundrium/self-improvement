import { error, json } from '@sveltejs/kit';

import { requireDb } from '$lib/server/guards';
import {
	refineMealEstimate,
	validateAIRefinement,
	validateMealEstimate
} from '../../../../server/meal-analysis';
import { getEntryWithMeals } from '../../../../server/nutrition';
import { requireOpenRouterApiKey } from '../../../../server/openrouter';
import type { RequestHandler } from './$types';

const MAX_CORRECTION_LENGTH = 500;

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const apiKey = requireOpenRouterApiKey(platform);

	const db = requireDb(locals);
	const entry = await getEntryWithMeals(db, params.entryId, locals.user.id);
	if (!entry) error(404, 'Meal not found.');

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid JSON body.');
	const mealId = typeof body.mealId === 'string' ? body.mealId : '';
	const storedMeal = entry.meals.find((meal) => meal.id === mealId);
	if (!storedMeal)
		error(404, 'Meal not found. Save newly added meals before refining them with AI.');

	const correction =
		typeof body.correction === 'string'
			? body.correction.trim().slice(0, MAX_CORRECTION_LENGTH)
			: '';
	if (correction.length < 2) error(400, 'Tell us what should change in the estimate.');

	let currentEstimate: ReturnType<typeof validateMealEstimate>;
	try {
		currentEstimate = validateMealEstimate(body.meal);
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'The current meal estimate is invalid.');
	}

	const image = parseStoredImage(storedMeal.imageDataUrl);
	try {
		const raw = await refineMealEstimate(
			image?.base64 ?? '',
			image?.mimeType ?? '',
			'',
			currentEstimate,
			correction,
			apiKey
		);
		return json({ revision: validateAIRefinement(raw) });
	} catch (cause) {
		error(502, cause instanceof Error ? cause.message : 'AI correction failed.');
	}
};

function parseStoredImage(value: string) {
	const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
	if (!match) return null;
	return { mimeType: match[1], base64: match[2] };
}
