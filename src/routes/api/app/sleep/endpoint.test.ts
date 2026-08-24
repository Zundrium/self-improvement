import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	db: {},
	ensureSettings: vi.fn(),
	getAdherence: vi.fn(),
	getTracked: vi.fn(),
	updateSettings: vi.fn()
}));

vi.mock('../../../(trackers)/sleep/server/sleep', () => ({
	ensureSleepSettings: services.ensureSettings,
	getSleepAdherence: services.getAdherence,
	pendingSleepSummary: (date: string, bedtime: string) => ({
		localDate: date,
		configuredBedtime: bedtime,
		windowStartAt: null,
		windowEndAt: null,
		lateUsageSeconds: 0,
		latestScreenActivityAt: null,
		usedApps: [],
		violatingApps: [],
		status: 'pending'
	}),
	updateSleepSettings: services.updateSettings
}));
vi.mock('../../../(trackers)/screen-time/server/screen-time', () => ({
	getTrackedScreenTimePackages: services.getTracked
}));

import { GET, PATCH } from './+server';

const settings = {
	bedtime: '22:30',
	remindersEnabled: false,
	timeZone: 'UTC',
	lastReceivedAt: null
};

describe('sleep app endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-17T12:00:00.000Z'));
		services.ensureSettings.mockResolvedValue(settings);
		services.getAdherence.mockResolvedValue([]);
		services.getTracked.mockResolvedValue([]);
		services.updateSettings.mockResolvedValue({ bedtime: '23:00', remindersEnabled: true });
	});

	afterEach(() => vi.useRealTimers());

	it('returns a clear setup state and seven pending bedtime summaries', async () => {
		const response = await GET(getEvent() as never);
		const data = (await response.json()) as {
			setupRequired: boolean;
			settings: unknown;
			days: Array<{ status: string; configuredBedtime: string }>;
		};

		expect(data.setupRequired).toBe(true);
		expect(data.settings).toEqual({ bedtime: '22:30', remindersEnabled: false });
		expect(data.days).toHaveLength(7);
		expect(data.days[0]).toMatchObject({ status: 'pending', configuredBedtime: '22:30' });
	});

	it('validates and updates bedtime and reminder settings together', async () => {
		const response = await PATCH(patchEvent({ bedtime: '23:00', remindersEnabled: true }) as never);

		expect(services.updateSettings).toHaveBeenCalledWith(services.db, 'user-1', {
			bedtime: '23:00',
			remindersEnabled: true,
			timeZone: 'UTC'
		});
		expect(await response.json()).toEqual({ bedtime: '23:00', remindersEnabled: true });
	});
});

function getEvent() {
	return {
		locals: { db: services.db, user: { id: 'user-1' } },
		url: new URL('https://example.com/api/app/sleep?timeZone=UTC')
	};
}

function patchEvent(body: Record<string, unknown>) {
	return {
		locals: { db: services.db, user: { id: 'user-1' } },
		request: new Request('https://example.com/api/app/sleep', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...body, timeZone: 'UTC' })
		})
	};
}
