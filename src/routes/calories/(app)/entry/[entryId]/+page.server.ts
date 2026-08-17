import { error, fail, redirect } from '@sveltejs/kit';

import { requireDb, requireUser } from '$lib/server/guards';
import {
	deleteEntry,
	getEntryWithMeals,
	replaceEntry,
	type IngredientInput,
	type MealInput
} from '../../../server/nutrition';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const result = await getEntryWithMeals(requireDb(event.locals), event.params.entryId, user.id);
	if (!result) error(404, 'Entry not found.');
	return { entry: result };
};

export const actions: Actions = {
	save: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const date = readString(form.get('date'));
		let meals: MealInput[];
		try {
			meals = parseMeals(readString(form.get('meals')));
		} catch (cause) {
			return fail(400, {
				error: cause instanceof Error ? cause.message : 'Could not read the meal data.'
			});
		}

		try {
			const result = await replaceEntry(requireDb(event.locals), event.params.entryId, user.id, {
				date,
				name: readString(form.get('name')),
				notes: readString(form.get('notes')),
				meals
			});
			if (!result) return fail(404, { error: 'Entry not found.' });
		} catch (cause) {
			return fail(400, {
				error: cause instanceof Error ? cause.message : 'Could not save this entry.'
			});
		}
		redirect(303, `/calories/log/${date}`);
	},
	delete: async (event) => {
		const user = requireUser(event);
		const db = requireDb(event.locals);
		const current = await getEntryWithMeals(db, event.params.entryId, user.id);
		if (!current) return fail(404, { error: 'Entry not found.' });
		await deleteEntry(db, event.params.entryId, user.id);
		redirect(303, `/calories/log/${current.date}`);
	}
};

function parseMeals(value: string): MealInput[] {
	const parsed = JSON.parse(value) as unknown;
	if (!Array.isArray(parsed)) throw new Error('Meal data must be a list.');
	return parsed.slice(0, 30).map((raw) => {
		const item = asRecord(raw);
		const ingredientValues = Array.isArray(item.ingredients) ? item.ingredients : [];
		return {
			name: readString(item.name),
			notes: readString(item.notes),
			imageDataUrl: readString(item.imageDataUrl),
			ingredients: ingredientValues.slice(0, 40).map((ingredientRaw): IngredientInput => {
				const ingredient = asRecord(ingredientRaw);
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
			})
		};
	});
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function readString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}
