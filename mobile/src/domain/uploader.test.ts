import { describe, expect, it, vi } from 'vitest';
import type { AppCredentials, TrackerId } from './model';
import { TrackerUploader } from './uploader';

const credentials: AppCredentials = {
	apiBaseUrl: 'https://example.com',
	timeZone: 'UTC',
	token: 'signed-session-token'
};

const uploads: Array<[TrackerId, string]> = [
	['steps', 'https://example.com/steps/api/health-connect'],
	['sleep', 'https://example.com/sleep/api/health-connect'],
	['screenTime', 'https://example.com/screen-time/api/usage']
];

describe('tracker uploader', () => {
	it.each(uploads)('uses the exact %s authenticated endpoint', async (tracker, url) => {
		const request = vi.fn(async () => new Response('{}', { status: 200 }));
		const payload = { tracker };

		await new TrackerUploader(request).upload(tracker, credentials, payload);

		expect(request).toHaveBeenCalledOnce();
		expect(request).toHaveBeenCalledWith(
			url,
			expect.objectContaining({
				method: 'POST',
				headers: {
					Authorization: `Bearer ${credentials.token}`,
					'Content-Type': 'application/json',
					'X-Time-Zone': credentials.timeZone
				},
				body: JSON.stringify(payload)
			})
		);
	});

	it('rejects an oversized body before making a network request', async () => {
		const request = vi.fn(async () => new Response('{}', { status: 200 }));
		const uploader = new TrackerUploader(request);
		await expect(
			uploader.upload('steps', credentials, { value: 'x'.repeat(128 * 1024) })
		).rejects.toMatchObject({ category: 'validation' });
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		[401, 'auth'],
		[422, 'validation'],
		[503, 'server']
	])('classifies HTTP %s as %s', async (status, category) => {
		const uploader = new TrackerUploader(async () => new Response('{}', { status }));
		await expect(uploader.upload('steps', credentials, {})).rejects.toMatchObject({ category });
	});

	it('classifies a rejected fetch as a network failure', async () => {
		const uploader = new TrackerUploader(async () => {
			throw new TypeError('offline');
		});
		await expect(uploader.upload('steps', credentials, {})).rejects.toMatchObject({
			category: 'network',
			retryable: true
		});
	});
});
