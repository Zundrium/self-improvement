import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	db: {},
	ensureConnection: vi.fn(),
	getConnection: vi.fn(),
	getDaily: vi.fn(),
	getKnownApps: vi.fn(),
	setTracked: vi.fn()
}));

vi.mock('../../../(trackers)/screen-time/server/screen-time', () => ({
	ensureScreenTimeConnection: services.ensureConnection,
	getScreenTimeConnection: services.getConnection,
	getDailyScreenTime: services.getDaily,
	getKnownScreenTimeApps: services.getKnownApps,
	setScreenTimeAppTracked: services.setTracked
}));

import { GET, PATCH } from './+server';

const browser = {
	package: 'com.example.browser',
	name: 'Browser',
	minutes: 45,
	last_used: '2026-08-17T11:00:00Z'
};

const snapshot = {
	localDate: '2026-08-17',
	totalMinutes: 45,
	apps: [browser]
};

const knownApps = [
	{ package: 'com.example.browser', name: 'Browser', tracked: true },
	{ package: 'com.example.mail', name: 'Mail', tracked: false }
];

describe('screen-time app endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-17T12:00:00Z'));
		services.ensureConnection.mockResolvedValue({ userId: 'user-1', timeZone: 'UTC' });
		services.getConnection.mockResolvedValue({
			companionTimeZone: 'UTC',
			lastReceivedAt: new Date('2026-08-17T11:30:00Z')
		});
		services.getDaily.mockResolvedValue([snapshot]);
		services.getKnownApps.mockResolvedValue(knownApps);
		services.setTracked.mockResolvedValue(undefined);
	});

	afterEach(() => vi.useRealTimers());

	it('returns tracked usage and all known apps partitionable by tracked state', async () => {
		const response = await GET(eventForGet() as never);
		const data = (await response.json()) as {
			usage: unknown;
			knownApps: unknown;
			days: Array<{ date: string; totalMinutes: number }>;
		};

		expect(data.usage).toEqual({ totalMinutes: 45, apps: [browser] });
		expect(data.knownApps).toEqual(knownApps);
		expect(data.days[0]).toEqual({ date: '2026-08-17', totalMinutes: 45 });
		expect(services.getKnownApps).toHaveBeenCalledWith(services.db, 'user-1');
	});

	it('adds or removes a package for only the authenticated user', async () => {
		const response = await PATCH(
			eventForPatch({ package: ' com.example.browser ', tracked: true }) as never
		);

		expect(services.setTracked).toHaveBeenCalledWith(
			services.db,
			'user-1',
			'com.example.browser',
			true
		);
		expect(await response.json()).toEqual({ package: 'com.example.browser', tracked: true });
	});

	it('rejects invalid tracked-app choices', async () => {
		await expect(
			PATCH(eventForPatch({ package: '', tracked: 'yes' }) as never)
		).rejects.toMatchObject({
			status: 400
		});
		expect(services.setTracked).not.toHaveBeenCalled();
	});

	it('requires authentication before changing tracked apps', async () => {
		const event = eventForPatch({ package: 'com.example.browser', tracked: false });

		await expect(PATCH({ ...event, locals: { db: services.db } } as never)).rejects.toMatchObject({
			status: 401
		});
		expect(services.setTracked).not.toHaveBeenCalled();
	});
});

function eventForGet() {
	return {
		locals: { db: services.db, user: { id: 'user-1' } },
		url: new URL('https://example.com/api/app/screen-time?date=2026-08-17&timeZone=UTC')
	};
}

function eventForPatch(body: Record<string, unknown>) {
	return {
		locals: { db: services.db, user: { id: 'user-1' } },
		request: new Request('https://example.com/api/app/screen-time', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	};
}
