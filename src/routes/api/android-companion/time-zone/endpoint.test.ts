import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
	db: {},
	InvalidCompanionTokenError: class extends Error {},
	updateTimeZone: vi.fn()
}));

vi.mock('$lib/server/guards', () => ({ requireDb: () => services.db }));
vi.mock('$lib/server/android-companion/time-zone', () => ({
	InvalidCompanionTokenError: services.InvalidCompanionTokenError,
	updateAndroidCompanionTimeZone: services.updateTimeZone
}));

import { POST } from './+server';

const token = `stp_${'a'.repeat(64)}`;

describe('Android companion time-zone endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.updateTimeZone.mockResolvedValue('Europe/Amsterdam');
	});

	it('authenticates with the companion steps token and updates its user', async () => {
		const response = await POST({
			request: requestWith({ timeZone: 'Europe/Amsterdam' }),
			locals: {}
		} as never);

		expect(services.updateTimeZone).toHaveBeenCalledWith(services.db, token, 'Europe/Amsterdam');
		expect(await response.json()).toEqual({ timeZone: 'Europe/Amsterdam' });
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('rejects tokens that are not companion credentials', async () => {
		services.updateTimeZone.mockRejectedValue(new services.InvalidCompanionTokenError());
		const response = await POST({ request: requestWith({ timeZone: 'UTC' }), locals: {} } as never);

		expect(response.status).toBe(401);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('rejects unknown JSON fields', async () => {
		const response = await POST({
			request: requestWith({ timeZone: 'UTC', userId: 'other-user' }),
			locals: {}
		} as never);

		expect(response.status).toBe(400);
		expect(services.updateTimeZone).not.toHaveBeenCalled();
	});

	it('rejects oversized bodies without parsing them', async () => {
		const response = await POST({
			request: requestWith({ timeZone: 'x'.repeat(300) }),
			locals: {}
		} as never);

		expect(response.status).toBe(413);
		expect(services.updateTimeZone).not.toHaveBeenCalled();
	});
});

function requestWith(body: Record<string, unknown>) {
	const serialized = JSON.stringify(body);
	return new Request('https://example.com/api/android-companion/time-zone', {
		method: 'POST',
		headers: {
			'X-Steps-Token': token,
			'Content-Type': 'application/json',
			'Content-Length': String(new TextEncoder().encode(serialized).byteLength)
		},
		body: serialized
	});
}
