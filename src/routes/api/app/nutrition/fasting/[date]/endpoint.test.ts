import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	db: {},
	cancelFastingDay: vi.fn(),
	getFastingDay: vi.fn()
}));

vi.mock('$lib/server/guards', () => ({ requireDb: () => services.db }));
vi.mock('$lib/utils', () => ({ todayIso: () => '2028-03-05' }));
vi.mock('../../../../../(trackers)/nutrition/server/fasting', () => ({
	cancelFastingDay: services.cancelFastingDay,
	getFastingDay: services.getFastingDay
}));

import { DELETE, GET } from './+server';

describe('fasting day endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.getFastingDay.mockResolvedValue({ userId: 'user-1', date: '2028-03-03' });
		services.cancelFastingDay.mockResolvedValue({ date: '2028-03-03' });
	});

	it('loads and cancels a day through the authenticated owner', async () => {
		const getResponse = await GET(eventFor('user-1') as never);
		const deleteResponse = await DELETE(eventFor('user-1') as never);

		expect(services.getFastingDay).toHaveBeenCalledWith(services.db, 'user-1', '2028-03-03');
		expect(services.cancelFastingDay).toHaveBeenCalledWith(services.db, 'user-1', '2028-03-03');
		expect(await getResponse.json()).toEqual({ date: '2028-03-03', fasting: true });
		expect(await deleteResponse.json()).toEqual({ date: '2028-03-03' });
	});

	it('does not expose a fasting day that is absent for this owner', async () => {
		services.getFastingDay.mockResolvedValueOnce(null);
		services.cancelFastingDay.mockResolvedValueOnce(null);

		expect(await (await GET(eventFor('other-user') as never)).json()).toEqual({
			date: '2028-03-03',
			fasting: false
		});
		await expect(DELETE(eventFor('other-user') as never)).rejects.toMatchObject({ status: 404 });
	});
});

function eventFor(userId: string) {
	return {
		locals: { user: { id: userId } },
		params: { date: '2028-03-03' }
	};
}
