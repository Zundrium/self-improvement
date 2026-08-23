import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	db: {},
	markFastingDays: vi.fn(),
	InputError: class NutritionFastingInputError extends Error {}
}));

vi.mock('$lib/server/guards', () => ({ requireDb: () => services.db }));
vi.mock('$lib/utils', () => ({ todayIso: () => '2028-03-05' }));
vi.mock('../../../../(trackers)/nutrition/server/fasting', () => ({
	markFastingDays: services.markFastingDays,
	NutritionFastingInputError: services.InputError,
	isNutritionFastingConflict: (cause: unknown) =>
		cause instanceof Error && cause.message === 'fasting conflict'
}));

import { POST } from './+server';

describe('fasting endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.markFastingDays.mockResolvedValue(['2028-03-03', '2028-03-04']);
	});

	it('marks consecutive dates for only the authenticated owner', async () => {
		const response = await POST(eventWithBody({ date: '2028-03-03', days: 2 }) as never);

		expect(services.markFastingDays).toHaveBeenCalledWith(
			services.db,
			'user-1',
			'2028-03-03',
			2,
			'2028-03-05'
		);
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ dates: ['2028-03-03', '2028-03-04'] });
	});

	it('returns a conflict without retrying a partial range', async () => {
		services.markFastingDays.mockRejectedValueOnce(new Error('fasting conflict'));

		await expect(
			POST(eventWithBody({ date: '2028-03-03', days: 2 }) as never)
		).rejects.toMatchObject({ status: 409 });
		expect(services.markFastingDays).toHaveBeenCalledTimes(1);
	});

	it('rejects invalid range input', async () => {
		services.markFastingDays.mockRejectedValueOnce(new services.InputError('Invalid days.'));

		await expect(
			POST(eventWithBody({ date: '2028-03-03', days: 0 }) as never)
		).rejects.toMatchObject({ status: 400 });
	});
});

function eventWithBody(body: Record<string, unknown>) {
	return {
		request: new Request('https://example.com/api/app/nutrition/fasting', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { user: { id: 'user-1' } }
	};
}
