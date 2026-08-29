import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { localSecretStore } from '$lib/local/secrets';
import {
	analyzeMeal,
	OPENROUTER_MODEL,
	validateAIRefinement,
	validateAIResult,
	validateMealEstimate
} from './meal-analysis';

afterEach(async () => {
	vi.unstubAllGlobals();
	await localSecretStore.clearOpenRouterApiKey();
});

describe('nutrition AI responses', () => {
	it('uses the locally stored key and tracker model for OpenRouter requests', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					choices: [
						{
							message: {
								content: JSON.stringify({
									meal_name: 'Two eggs',
									ingredients: [{ name: 'Eggs', quantity: 2, unit: 'piece', calories: 156 }]
								})
							}
						}
					]
				}),
				{ status: 200 }
			)
		);
		vi.stubGlobal('fetch', fetchMock);
		await localSecretStore.saveOpenRouterApiKey('local-key');

		await analyzeMeal({ imageDataUrl: '', description: 'Two eggs' });

		const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(String(request.body)) as { model: string };
		expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
		expect(request.headers).toMatchObject({ Authorization: 'Bearer local-key' });
		expect(body.model).toBe(OPENROUTER_MODEL);
	});

	it('normalizes a JSON meal estimate', () => {
		const result = validateAIResult(
			JSON.stringify({
				meal_name: 'Eggs on toast',
				ingredients: [
					{
						name: 'Eggs',
						quantity: 2,
						unit: 'piece',
						calories: 156,
						protein_g: 12.6,
						carbs_g: 1.1,
						fat_g: 10.6
					}
				]
			})
		);

		expect(result).toMatchObject({
			mealName: 'Eggs on toast',
			ingredients: [{ name: 'Eggs', quantity: 2, unit: 'piece', calories: 156 }]
		});
	});

	it('accepts an editable meal and validates refinement replies', () => {
		const estimate = validateMealEstimate({
			name: 'Yoghurt',
			ingredients: [{ name: 'Greek yoghurt', quantity: 200, unit: 'g', calories: 240 }]
		});
		const refinement = validateAIRefinement({
			reply: 'Changed the yoghurt amount.',
			meal_name: estimate.mealName,
			ingredients: estimate.ingredients.map((item) => ({
				...item,
				protein_g: item.proteinG,
				carbs_g: item.carbsG,
				fat_g: item.fatG
			}))
		});

		expect(refinement.reply).toBe('Changed the yoghurt amount.');
		expect(refinement.ingredients[0].calories).toBe(240);
	});

	it('rejects responses without detected food', () => {
		expect(() => validateAIResult({ meal_name: 'Empty', ingredients: [] })).toThrow(
			'No food was detected'
		);
	});
});
