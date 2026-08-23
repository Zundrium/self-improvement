import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	analyzeMeal: vi.fn(),
	validateAIResult: vi.fn(),
	requireApiKey: vi.fn()
}));

vi.mock('../../../server/meal-analysis', () => ({
	analyzeMeal: services.analyzeMeal,
	validateAIResult: services.validateAIResult
}));
vi.mock('../../../server/openrouter', () => ({
	requireOpenRouterApiKey: services.requireApiKey
}));

import { POST } from './+server';

const estimate = { mealName: 'Eggs on toast', ingredients: [{ name: 'Eggs' }] };

describe('meal analysis endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.requireApiKey.mockReturnValue('api-key');
		services.analyzeMeal.mockResolvedValue('{"meal_name":"Eggs on toast"}');
		services.validateAIResult.mockReturnValue(estimate);
	});

	it('analyzes a description without requiring an image', async () => {
		const response = await POST(
			eventWithBody({ description: '  Two eggs on buttered toast  ' }) as never
		);

		expect(services.analyzeMeal).toHaveBeenCalledWith(
			'',
			'',
			'Two eggs on buttered toast',
			'api-key'
		);
		expect(await response.json()).toEqual({ estimate });
	});

	it('preserves photo analysis', async () => {
		await POST(eventWithBody({ image: 'data:image/jpg;base64,YQ==' }) as never);

		expect(services.analyzeMeal).toHaveBeenCalledWith('YQ==', 'image/jpeg', '', 'api-key');
	});

	it('rejects a request without a photo or description', async () => {
		await expect(POST(eventWithBody({}) as never)).rejects.toMatchObject({ status: 400 });
		expect(services.analyzeMeal).not.toHaveBeenCalled();
	});
});

function eventWithBody(body: Record<string, unknown>) {
	return {
		request: new Request('https://example.com/nutrition/api/meals/analyze', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { user: { id: 'user-1' } },
		platform: { env: {} }
	};
}
