import type { NutritionEntry } from '$lib/api-types';
import { submittedSnapshot } from '$lib/forms/draft';

export type EditableIngredient = {
	id: string;
	name: string;
	quantity: number;
	unit: string;
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	notes: string;
};

export type EditableMeal = {
	id: string;
	name: string;
	imageDataUrl: string;
	ingredients: EditableIngredient[];
};

export type EntryDraft = {
	date: string;
	time: string;
	name: string;
	notes: string;
	meals: EditableMeal[];
};

export function draftFromEntry(entry: NutritionEntry): EntryDraft {
	const createdAt = new Date(entry.createdAt);
	return {
		date: entry.date,
		time: `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`,
		name: entry.name,
		notes: entry.notes,
		meals: submittedSnapshot(entry.meals)
	};
}

export function newEntryDraft(date: string): EntryDraft {
	const now = new Date();
	return {
		date,
		time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
		name: 'Meal',
		notes: '',
		meals: [
			{
				id: crypto.randomUUID(),
				name: 'Meal',
				imageDataUrl: '',
				ingredients: [
					{
						id: crypto.randomUUID(),
						name: '',
						quantity: 1,
						unit: 'serving',
						calories: 0,
						proteinG: 0,
						carbsG: 0,
						fatG: 0,
						notes: ''
					}
				]
			}
		]
	};
}

export function snapshotDraft(draft: EntryDraft): EntryDraft {
	return submittedSnapshot(draft);
}

export function draftFingerprint(draft: EntryDraft) {
	return JSON.stringify(draft);
}
