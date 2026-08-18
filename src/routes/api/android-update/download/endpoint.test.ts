import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({ latestApkDownloadLocation: vi.fn() }));

vi.mock('$lib/server/android-update', () => ({
	latestApkDownloadLocation: services.latestApkDownloadLocation
}));

import { GET } from './+server';

describe('Android update download endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.latestApkDownloadLocation.mockResolvedValue(
			'https://release-assets.githubusercontent.com/update.apk?sig=1'
		);
	});

	it('redirects to a short-lived signed GitHub asset URL', async () => {
		const response = await GET(eventWith('read-token') as never);

		expect(services.latestApkDownloadLocation).toHaveBeenCalledWith('read-token');
		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toContain('release-assets.githubusercontent.com');
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('is unavailable without the server-side token', async () => {
		const response = await GET(eventWith() as never);

		expect(response.status).toBe(503);
		expect(services.latestApkDownloadLocation).not.toHaveBeenCalled();
	});
});

function eventWith(token?: string) {
	return { platform: { env: { GITHUB_RELEASE_TOKEN: token } } };
}
