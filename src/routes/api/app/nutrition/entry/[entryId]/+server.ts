import { error, json } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import {
	deleteEntry,
	getEntryWithMeals,
	localDateTime,
	replaceEntry,
	type IngredientInput,
	type MealInput
} from '../../../../../(trackers)/nutrition/server/nutrition';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const entry = await getEntryWithMeals(requireDb(event.locals), event.params.entryId, user.id);
	if (!entry) error(404, 'Entry not found.');
	return json({ entry });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const body = (await event.request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid meal entry.');
	try {
		const date = readString(body.date);
		const createdAt = localDateTime(date, readString(body.time), Number(body.timeZoneOffset));
		const result = await replaceEntry(requireDb(event.locals), event.params.entryId, user.id, {
			date,
			createdAt,
			name: readString(body.name),
			notes: readString(body.notes),
			meals: parseMeals(body.meals)
		});
		if (!result) error(404, 'Entry not found.');
		return json({ entry: result });
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'Could not save this entry.');
	}
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const current = await getEntryWithMeals(db, event.params.entryId, user.id);
	if (!current) error(404, 'Entry not found.');
	await deleteEntry(db, event.params.entryId, user.id);
	return json({ date: current.date });
};

function parseMeals(value: unknown): MealInput[] {
	if (!Array.isArray(value)) throw new Error('Meal data must be a list.');
	return value.slice(0, 30).map((raw) => {
		const item = asRecord(raw);
		const ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
		return {
			name: readString(item.name),
			notes: readString(item.notes),
			imageDataUrl: readString(item.imageDataUrl),
			ingredients: ingredients.slice(0, 40).map(toIngredient)
		};
	});
}

function toIngredient(raw: unknown): IngredientInput {
	const ingredient = asRecord(raw);
	return {
		name: readString(ingredient.name),
		quantity: Number(ingredient.quantity),
		unit: readString(ingredient.unit),
		calories: Number(ingredient.calories),
		proteinG: Number(ingredient.proteinG),
		carbsG: Number(ingredient.carbsG),
		fatG: Number(ingredient.fatG),
		notes: readString(ingredient.notes)
	};
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function readString(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}
