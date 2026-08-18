import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({ latestAndroidRelease: vi.fn() }));

vi.mock('$lib/server/android-update', () => ({
	latestAndroidRelease: services.latestAndroidRelease
}));

import { GET } from './+server';

describe('Android update endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.latestAndroidRelease.mockResolvedValue({ tag: 'v0.1.2', assetId: 11 });
	});

	it('returns the latest version and public download endpoint', async () => {
		const response = await GET(eventWith('read-token') as never);

		expect(services.latestAndroidRelease).toHaveBeenCalledWith('read-token');
		expect(await response.json()).toEqual({
			tag_name: 'v0.1.2',
			apk_url: 'https://self.zund.cc/api/android-update/download'
		});
		expect(response.headers.get('cache-control')).toBe('public, max-age=300');
	});

	it('is unavailable without the server-side token', async () => {
		const response = await GET(eventWith() as never);

		expect(response.status).toBe(503);
		expect(services.latestAndroidRelease).not.toHaveBeenCalled();
	});
});

function eventWith(token?: string) {
	return {
		platform: { env: { GITHUB_RELEASE_TOKEN: token } },
		url: new URL('https://self.zund.cc/api/android-update')
	};
}
