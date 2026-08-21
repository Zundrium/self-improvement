import { apiRequest } from '$lib/api';
import type { ActionFeedData } from '$lib/api-types';
import { loadNativeActionFeedItems } from '$native/action-feed';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const [layoutData, actionFeed] = await Promise.all([
		parent(),
		apiRequest<ActionFeedData>('/api/app/action-feed')
	]);
	const trackerIds = layoutData.enabledTrackers.map(({ id }) => id);
	const nativeItems = await loadNativeActionFeedItems(trackerIds).catch(() => []);
	return { actionFeed, nativeItems };
};
