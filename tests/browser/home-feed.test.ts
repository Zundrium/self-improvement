import { expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { mount, unmount } from 'svelte';
import HomeFeedHarness from './HomeFeedHarness.svelte';
import '../../src/routes/global.css';

const mocks = vi.hoisted(() => ({
	loadNativeActionFeedItems: vi.fn(async () => [
		{
			id: 'update',
			title: 'App update available',
			reason: '',
			trackerIds: [],
			icon: 'update',
			priority: 'high',
			action: { type: 'navigate', href: '/profile' }
		}
	])
}));
vi.mock('$native/action-feed', () => mocks);
vi.mock('$native/android-data', () => ({ androidSyncCoordinator: { sync: vi.fn() } }));
vi.mock('$native/android-updater', () => ({ installAndroidUpdate: vi.fn() }));
vi.mock('$lib/app/resources', () => ({ APP_RESOURCES: {}, refreshAppData: vi.fn() }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/?date=2026-03-20') } }));

it('keeps and refreshes native home cards after local loader invalidation', async () => {
	const component = mount(HomeFeedHarness, { target: document.body });
	try {
		await expect.element(page.getByText('App update available')).toBeVisible();
		await page.getByRole('button', { name: 'Refresh loader data' }).click();
		await expect.element(page.getByText('App update available')).toBeVisible();
		expect(mocks.loadNativeActionFeedItems).toHaveBeenCalledTimes(2);
	} finally {
		await unmount(component);
		document.body.innerHTML = '';
	}
});
