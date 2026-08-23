import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	refineMealEstimate: vi.fn(),
	validateAIRefinement: vi.fn(),
	validateMealEstimate: vi.fn(),
	requireApiKey: vi.fn()
}));

vi.mock('../../../server/meal-analysis', () => ({
	refineMealEstimate: services.refineMealEstimate,
	validateAIRefinement: services.validateAIRefinement,
	validateMealEstimate: services.validateMealEstimate
}));
vi.mock('../../../server/openrouter', () => ({
	requireOpenRouterApiKey: services.requireApiKey
}));

import { POST } from './+server';

const estimate = { mealName: 'Eggs', ingredients: [{ name: 'Eggs' }] };
const revision = { ...estimate, reply: 'Added the toast.' };

describe('meal refinement endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.requireApiKey.mockReturnValue('api-key');
		services.validateMealEstimate.mockReturnValue(estimate);
		services.refineMealEstimate.mockResolvedValue('{"meal_name":"Eggs"}');
		services.validateAIRefinement.mockReturnValue(revision);
	});

	it('carries a text-only meal description into refinement', async () => {
		const response = await POST(
			eventWithBody({
				description: 'Two scrambled eggs',
				estimate,
				correction: 'Add one slice of toast'
			}) as never
		);

		expect(services.refineMealEstimate).toHaveBeenCalledWith(
			'',
			'',
			'Two scrambled eggs',
			estimate,
			'Add one slice of toast',
			'api-key'
		);
		expect(await response.json()).toEqual({ estimate: revision });
	});

	it('still requires the original meal source', async () => {
		await expect(
			POST(eventWithBody({ estimate, correction: 'Add toast' }) as never)
		).rejects.toMatchObject({ status: 400 });
		expect(services.refineMealEstimate).not.toHaveBeenCalled();
	});
});

function eventWithBody(body: Record<string, unknown>) {
	return {
		request: new Request('https://example.com/nutrition/api/meals/refine', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { user: { id: 'user-1' } },
		platform: { env: {} }
	};
}
