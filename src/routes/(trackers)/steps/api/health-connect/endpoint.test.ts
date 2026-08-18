import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	db: {},
	findLegacy: vi.fn(),
	findCompanion: vi.fn(),
	record: vi.fn()
}));

vi.mock('$lib/server/guards', () => ({ requireDb: () => services.db }));
vi.mock('../../server/steps', () => ({
	findConnectionByToken: services.findLegacy,
	findConnectionByCompanionToken: services.findCompanion,
	recordHealthConnectPayload: services.record
}));

import { POST } from './+server';

const token = `stp_${'a'.repeat(64)}`;
const connection = { userId: 'user-1', timeZone: 'UTC' };
const payload = {
	timestamp: '2026-08-17T12:00:00Z',
	app_version: '1.0.0',
	steps: []
};

describe('steps ingestion authentication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.findLegacy.mockResolvedValue(null);
		services.findCompanion.mockResolvedValue(connection);
		services.record.mockResolvedValue(0);
	});

	it('falls back to the companion token lookup and passes its connection shape', async () => {
		const response = await POST({ request: requestWithToken(), locals: {} } as never);

		expect(services.findLegacy).toHaveBeenCalledWith(services.db, token);
		expect(services.findCompanion).toHaveBeenCalledWith(services.db, token);
		expect(services.record).toHaveBeenCalledWith(services.db, connection, payload);
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('keeps legacy webhook tokens as the first fallback', async () => {
		services.findLegacy.mockResolvedValue(connection);
		const response = await POST({ request: requestWithToken(), locals: {} } as never);

		expect(services.findCompanion).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it('returns a retryable server status when authentication storage fails', async () => {
		services.findLegacy.mockRejectedValue(new Error('database unavailable'));

		const response = await POST({ request: requestWithToken(), locals: {} } as never);

		expect(response.status).toBe(503);
		expect(services.record).not.toHaveBeenCalled();
	});

	it('returns a retryable server status when storing steps fails', async () => {
		services.record.mockRejectedValue(new Error('database unavailable'));

		const response = await POST({ request: requestWithToken(), locals: {} } as never);

		expect(response.status).toBe(500);
	});
});

function requestWithToken() {
	return new Request('https://example.com/steps/api/health-connect', {
		method: 'POST',
		headers: { 'X-Steps-Token': token, 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
}
