import { describe, expect, it, vi } from 'vitest';
import type { PairingCredentials, TrackerId } from './model';
import { TrackerUploader } from './uploader';

const pairing: PairingCredentials = {
	version: 1,
	apiBaseUrl: 'https://example.com',
	timeZone: 'UTC',
	tokens: {
		steps: `stp_${'a'.repeat(64)}`,
		sleep: `slp_${'b'.repeat(64)}`,
		screenTime: `scr_${'c'.repeat(64)}`
	}
};

const uploads: Array<[TrackerId, string, string]> = [
	['steps', 'https://example.com/steps/api/health-connect', 'X-Steps-Token'],
	['sleep', 'https://example.com/sleep/api/health-connect', 'X-Sleep-Token'],
	['screenTime', 'https://example.com/screen-time/api/usage', 'X-Screen-Time-Token']
];

describe('tracker uploader', () => {
	it.each(uploads)('uses the exact %s endpoint and token header', async (tracker, url, header) => {
		const request = vi.fn(async () => new Response('{}', { status: 200 }));
		const payload = { tracker };

		await new TrackerUploader(request).upload(tracker, pairing, payload);

		expect(request).toHaveBeenCalledOnce();
		expect(request).toHaveBeenCalledWith(
			url,
			expect.objectContaining({
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					[header]: pairing.tokens[tracker]
				},
				body: JSON.stringify(payload)
			})
		);
	});

	it('rejects an oversized body before making a network request', async () => {
		const request = vi.fn(async () => new Response('{}', { status: 200 }));
		const uploader = new TrackerUploader(request);

		await expect(
			uploader.upload('steps', pairing, { value: 'x'.repeat(128 * 1024) })
		).rejects.toMatchObject({ category: 'validation' });
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		[401, 'auth'],
		[422, 'validation'],
		[503, 'server']
	])('classifies HTTP %s as %s', async (status, category) => {
		const uploader = new TrackerUploader(async () => new Response('{}', { status }));

		await expect(uploader.upload('steps', pairing, {})).rejects.toMatchObject({ category });
	});

	it('classifies a rejected fetch as a network failure', async () => {
		const uploader = new TrackerUploader(async () => {
			throw new TypeError('offline');
		});

		await expect(uploader.upload('steps', pairing, {})).rejects.toMatchObject({
			category: 'network',
			retryable: true
		});
	});
});
