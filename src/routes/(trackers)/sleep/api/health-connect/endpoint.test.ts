import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	db: {},
	findLegacy: vi.fn(),
	findCompanion: vi.fn(),
	record: vi.fn()
}));

vi.mock('$lib/server/guards', () => ({ requireDb: () => services.db }));
vi.mock('../../server/sleep', () => ({
	findSleepConnectionByToken: services.findLegacy,
	findSleepConnectionByCompanionToken: services.findCompanion,
	recordHealthConnectSleepPayload: services.record
}));

import { POST } from './+server';

const token = `slp_${'a'.repeat(64)}`;
const connection = { userId: 'user-1', timeZone: 'UTC' };
const payload = {
	timestamp: '2026-08-17T12:00:00Z',
	app_version: '1.0.0',
	sleep: []
};

describe('sleep ingestion authentication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.findLegacy.mockResolvedValue(null);
		services.findCompanion.mockResolvedValue(connection);
		services.record.mockResolvedValue(0);
	});

	it('accepts a companion token and forwards a valid empty request', async () => {
		const response = await POST({ request: requestWithToken(), locals: {} } as never);

		expect(services.findLegacy).toHaveBeenCalledWith(services.db, token);
		expect(services.findCompanion).toHaveBeenCalledWith(services.db, token);
		expect(services.record).toHaveBeenCalledWith(services.db, connection, payload);
		expect(await response.json()).toEqual({ accepted: 0 });
		expect(response.headers.get('cache-control')).toBe('no-store');
	});
});

function requestWithToken() {
	return new Request('https://example.com/sleep/api/health-connect', {
		method: 'POST',
		headers: { 'X-Sleep-Token': token, 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
}
