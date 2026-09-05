import { apiRequest } from '$lib/api';
import type { ActionFeedData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { APP_RESOURCES, registerResources } from '$lib/app/resources';

export const load: PageLoad = async ({ parent, url, depends }) => {
	registerResources(depends, APP_RESOURCES.local, APP_RESOURCES.actionFeed);
	const date = url.searchParams.get('date');
	const actionFeedPath = date
		? `/api/app/action-feed?date=${encodeURIComponent(date)}`
		: '/api/app/action-feed';
	const [, actionFeed] = await Promise.all([parent(), apiRequest<ActionFeedData>(actionFeedPath)]);
	// Native maintenance (including update checks) must not delay the local action feed.
	return { actionFeed, nativeItems: [] };
};
