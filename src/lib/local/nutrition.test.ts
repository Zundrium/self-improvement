import { describe, expect, it } from 'vitest';
import { createDefaultAppState } from './state';
import {
	MAX_NUTRITION_IMAGE_DATA_URL_LENGTH,
	createNutritionEntry
} from './nutrition';

const imagePrefix = 'data:image/jpeg;base64,';

function meal(imageDataUrl: string) {
	return [{ name: 'Lunch', imageDataUrl, ingredients: [{ name: 'Rice', calories: 300 }] }];
}

describe('nutrition image persistence', () => {
	it('stores a photo once without duplicating it into the thumbnail payload', () => {
		const imageDataUrl = imagePrefix + 'A'.repeat(MAX_NUTRITION_IMAGE_DATA_URL_LENGTH - imagePrefix.length);
		const entry = createNutritionEntry({ date: '2026-03-20', meals: meal(imageDataUrl) });
		const state = createDefaultAppState(new Date('2026-03-20T12:00:00.000Z'));
		state.nutrition.entries.push(entry);
		const serialized = JSON.stringify(state);

		expect(entry.thumbnail).toBe('');
		expect(entry.meals[0].imageDataUrl).toBe(imageDataUrl);
		expect(serialized.split(imageDataUrl)).toHaveLength(2);
		expect(serialized.length).toBeLessThan(MAX_NUTRITION_IMAGE_DATA_URL_LENGTH + 8 * 1024);
	});

	it('drops photos above the persisted image limit', () => {
		const oversizedImage = imagePrefix + 'A'.repeat(MAX_NUTRITION_IMAGE_DATA_URL_LENGTH);
		const entry = createNutritionEntry({ date: '2026-03-20', meals: meal(oversizedImage) });

		expect(entry.meals[0].imageDataUrl).toBe('');
		expect(entry.thumbnail).toBe('');
	});
});
