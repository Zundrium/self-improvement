import { describe, expect, it, vi } from 'vitest';
import {
	AndroidUpdateError,
	latestAndroidRelease,
	latestApkDownloadLocation
} from './android-update';

const release = {
	tag_name: 'v0.1.2',
	assets: [
		{ id: 10, name: 'self-improvement-v0.1.2.aab' },
		{ id: 11, name: 'self-improvement-v0.1.2.apk' }
	]
};

describe('Android updates', () => {
	it('finds the versioned APK with an authenticated GitHub request', async () => {
		const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(release));

		await expect(latestAndroidRelease('read-token', request)).resolves.toEqual({
			tag: 'v0.1.2',
			assetId: 11
		});
		const headers = new Headers(request.mock.calls[0][1]?.headers);
		expect(headers.get('Authorization')).toBe('Bearer read-token');
	});

	it('rejects releases without the expected APK', async () => {
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				Response.json({ tag_name: 'v0.1.2', assets: [{ id: 10, name: 'release.aab' }] })
			);

		await expect(latestAndroidRelease('read-token', request)).rejects.toBeInstanceOf(
			AndroidUpdateError
		);
	});

	it('returns only trusted signed GitHub asset locations', async () => {
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(release))
			.mockResolvedValueOnce(
				new Response(null, {
					status: 302,
					headers: { location: 'https://release-assets.githubusercontent.com/update.apk?sig=1' }
				})
			);

		await expect(latestApkDownloadLocation('read-token', request)).resolves.toContain(
			'release-assets.githubusercontent.com'
		);
		expect(request.mock.calls[1][1]?.redirect).toBe('manual');
	});

	it('rejects untrusted asset redirects', async () => {
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(release))
			.mockResolvedValueOnce(
				new Response(null, { status: 302, headers: { location: 'https://example.com/update.apk' } })
			);

		await expect(latestApkDownloadLocation('read-token', request)).rejects.toBeInstanceOf(
			AndroidUpdateError
		);
	});
});
