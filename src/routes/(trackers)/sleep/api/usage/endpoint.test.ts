import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({ db: {}, record: vi.fn() }));

vi.mock('$lib/server/guards', () => ({ requireDb: () => services.db }));
vi.mock('../../server/sleep', () => ({ recordSleepUsagePayload: services.record }));

import { POST } from './+server';

const payload = {
	timestamp: '2026-08-17T12:00:00.000Z',
	app_version: '1.0.0',
	source: 'usage_events',
	dates: ['2026-08-17'],
	activity_intervals: [],
	screen_interactive: []
};

describe('sleep adherence ingestion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.record.mockResolvedValue(1);
	});

	it('requires the authenticated mobile session', async () => {
		const response = await POST(eventWith({}) as never);
		expect(response.status).toBe(401);
		expect(services.record).not.toHaveBeenCalled();
	});

	it('forwards a valid usage-events payload with the device timezone', async () => {
		const locals = { user: { id: 'user-1' }, db: services.db };
		const response = await POST(eventWith(locals) as never);

		expect(services.record).toHaveBeenCalledWith(
			services.db,
			'user-1',
			'Europe/Amsterdam',
			payload
		);
		expect(await response.json()).toEqual({ accepted: 1 });
		expect(response.headers.get('cache-control')).toBe('no-store');
	});
});

function eventWith(locals: Record<string, unknown>) {
	return {
		locals,
		request: new Request('https://example.com/sleep/api/usage', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Time-Zone': 'Europe/Amsterdam' },
			body: JSON.stringify(payload)
		})
	};
}
