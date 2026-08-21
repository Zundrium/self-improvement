import type { ActionFeedItem, ActionPriority } from '$lib/api-types';

const priorityOrder: Record<ActionPriority, number> = {
	blocking: 0,
	warning: 1,
	activity: 2
};

export function mergeActionFeedItems(serverItems: ActionFeedItem[], nativeItems: ActionFeedItem[]) {
	const blockedTrackers = new Set(
		nativeItems
			.filter(({ priority }) => priority === 'blocking')
			.flatMap(({ trackerIds }) => trackerIds)
	);
	const relevantServerItems = serverItems.filter(
		({ trackerIds }) => !trackerIds.some((trackerId) => blockedTrackers.has(trackerId))
	);
	return [...nativeItems, ...relevantServerItems].toSorted(
		(left, right) => priorityOrder[left.priority] - priorityOrder[right.priority]
	);
}
