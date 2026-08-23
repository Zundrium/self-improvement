import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	db: {},
	addMeal: vi.fn(),
	createEntry: vi.fn(),
	deleteEntry: vi.fn(),
	finalizeEntry: vi.fn(),
	assertMealsAllowed: vi.fn(),
	toIngredientInputs: vi.fn(),
	validateMealEstimate: vi.fn()
}));

vi.mock('$lib/server/guards', () => ({ requireDb: () => services.db }));
vi.mock('../../server/meal-analysis', () => ({
	toIngredientInputs: services.toIngredientInputs,
	validateMealEstimate: services.validateMealEstimate
}));
vi.mock('../../server/fasting', () => ({
	assertMealsAllowed: services.assertMealsAllowed,
	isNutritionFastingConflict: (cause: unknown) =>
		cause instanceof Error && cause.message === 'fasting conflict'
}));
vi.mock('../../server/nutrition', () => ({
	addMeal: services.addMeal,
	createEntry: services.createEntry,
	deleteEntry: services.deleteEntry,
	finalizeEntry: services.finalizeEntry,
	validDate: () => true
}));

import { POST } from './+server';

const estimate = { mealName: 'Eggs on toast', ingredients: [{ name: 'Eggs' }] };
const ingredients = [{ name: 'Eggs', calories: 156 }];

describe('meal save endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.validateMealEstimate.mockReturnValue(estimate);
		services.toIngredientInputs.mockReturnValue(ingredients);
		services.assertMealsAllowed.mockResolvedValue(undefined);
		services.createEntry.mockResolvedValue({ id: 'entry-1', name: 'Eggs on toast' });
		services.addMeal.mockResolvedValue({ id: 'meal-1' });
	});

	it('saves an owned text-only meal without image data', async () => {
		const date = new Date().toISOString().slice(0, 10);
		const response = await POST(
			eventWithBody({ date, description: 'Two eggs on toast', estimate }) as never
		);

		expect(services.createEntry).toHaveBeenCalledWith(services.db, 'user-1', {
			date,
			name: 'Eggs on toast'
		});
		expect(services.addMeal).toHaveBeenCalledWith(services.db, 'entry-1', {
			name: 'Eggs on toast',
			imageDataUrl: '',
			ingredients
		});
		expect(services.finalizeEntry).toHaveBeenCalledWith(services.db, 'entry-1', 'user-1');
		expect(response.status).toBe(201);
	});

	it('rejects meal saves for an owned fasting date', async () => {
		services.assertMealsAllowed.mockRejectedValueOnce(new Error('fasting conflict'));
		const date = new Date().toISOString().slice(0, 10);

		await expect(
			POST(eventWithBody({ date, description: 'Two eggs', estimate }) as never)
		).rejects.toMatchObject({ status: 409 });
		expect(services.assertMealsAllowed).toHaveBeenCalledWith(services.db, 'user-1', date);
		expect(services.createEntry).not.toHaveBeenCalled();
	});

	it('rejects a save without its original photo or description', async () => {
		const date = new Date().toISOString().slice(0, 10);
		await expect(POST(eventWithBody({ date, estimate }) as never)).rejects.toMatchObject({
			status: 400
		});
		expect(services.createEntry).not.toHaveBeenCalled();
	});
});

function eventWithBody(body: Record<string, unknown>) {
	return {
		request: new Request('https://example.com/nutrition/api/meals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { user: { id: 'user-1' } }
	};
}
