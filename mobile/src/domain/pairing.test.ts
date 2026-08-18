import { describe, expect, it, vi } from 'vitest';
import {
	createAndroidCompanionPairingPayload,
	serializeAndroidCompanionPairingPayload
} from '$lib/android-companion/pairing';
import { DeviceTimeZoneHandshake, parsePairingCode } from './pairing';

const tokens = {
	steps: `stp_${'a'.repeat(64)}`,
	sleep: `slp_${'b'.repeat(64)}`,
	screenTime: `scr_${'c'.repeat(64)}`
};

describe('mobile pairing contract integration', () => {
	it('parses the shared serialized contract and preserves all tracker credentials', () => {
		const payload = createAndroidCompanionPairingPayload({
			apiBaseUrl: 'HTTPS://EXAMPLE.COM:443/',
			timeZone: 'Europe/Amsterdam',
			tokens
		});

		expect(parsePairingCode(serializeAndroidCompanionPairingPayload(payload))).toEqual({
			version: 1,
			apiBaseUrl: 'https://example.com',
			timeZone: 'Europe/Amsterdam',
			tokens
		});
	});

	it('replaces provisional UTC with the validated device zone before secure saving', async () => {
		const events: string[] = [];
		const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			events.push('server');
			expect(input.toString()).toBe('https://example.com/api/android-companion/time-zone');
			expect(init).toMatchObject({
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Steps-Token': tokens.steps
				},
				body: JSON.stringify({ timeZone: 'Asia/Tokyo' })
			});
			return new Response(null, { status: 204 });
		});
		const provisional = createAndroidCompanionPairingPayload({
			apiBaseUrl: 'https://example.com',
			timeZone: 'UTC',
			tokens
		});

		const pairing = await new DeviceTimeZoneHandshake(request, () => 'Asia/Tokyo').connect(
			provisional
		);
		events.push('secure');

		expect(pairing.timeZone).toBe('Asia/Tokyo');
		expect(events).toEqual(['server', 'secure']);
	});

	it('rejects an invalid runtime zone through the shared pairing schema', async () => {
		const request = vi.fn(async () => new Response(null, { status: 204 }));
		const provisional = createAndroidCompanionPairingPayload({
			apiBaseUrl: 'https://example.com',
			timeZone: 'UTC',
			tokens
		});

		await expect(
			new DeviceTimeZoneHandshake(request, () => 'GMT plus two').connect(provisional)
		).rejects.toMatchObject({ category: 'pairing' });
		expect(request).not.toHaveBeenCalled();
	});

	it('does not expose transport details from a failed time-zone update', async () => {
		const request = vi.fn(async () => {
			throw new Error(`request failed with ${tokens.steps}`);
		});
		const provisional = createAndroidCompanionPairingPayload({
			apiBaseUrl: 'https://example.com',
			timeZone: 'UTC',
			tokens
		});

		await expect(
			new DeviceTimeZoneHandshake(request, () => 'Asia/Tokyo').connect(provisional)
		).rejects.toMatchObject({
			category: 'network',
			message: 'No connection to the server. Sync will retry when the app resumes.'
		});
	});

	it('reasserts a stored device zone without rewriting unchanged secure state', async () => {
		const request = vi.fn(async () => new Response(null, { status: 204 }));
		const stored = createAndroidCompanionPairingPayload({
			apiBaseUrl: 'https://example.com',
			timeZone: 'Europe/Amsterdam',
			tokens
		});
		const handshake = new DeviceTimeZoneHandshake(request, () => 'Europe/Amsterdam');

		expect(await handshake.refresh(stored)).toBe(stored);
		expect(request).toHaveBeenCalledOnce();
	});

	it.each([
		JSON.stringify({ version: 2, apiBaseUrl: 'https://example.com', timeZone: 'UTC', tokens }),
		JSON.stringify({ version: 1, apiBaseUrl: 'http://example.com', timeZone: 'UTC', tokens }),
		JSON.stringify({
			version: 1,
			apiBaseUrl: 'https://example.com',
			timeZone: 'UTC',
			tokens: { ...tokens, sleep: tokens.steps }
		}),
		'{'
	])('rejects an invalid shared pairing payload', (serialized) => {
		expect(() => parsePairingCode(serialized)).toThrow('not a valid companion connection');
	});
});
