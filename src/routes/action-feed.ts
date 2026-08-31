import type { ActionFeedItem, ActionPriority } from '$lib/api-types';

const priorityOrder: Record<ActionPriority, number> = {
	blocking: 0,
	warning: 1,
	activity: 2
};

export function millisecondsUntilNextMinute(now: Date) {
	return 60_000 - now.getSeconds() * 1_000 - now.getMilliseconds();
}

export function mergeActionFeedItems(localItems: ActionFeedItem[], nativeItems: ActionFeedItem[]) {
	const blockedTrackers = new Set(
		nativeItems
			.filter(({ priority }) => priority === 'blocking')
			.flatMap(({ trackerIds }) => trackerIds)
	);
	const relevantLocalItems = localItems.filter(
		({ trackerIds }) => !trackerIds.some((trackerId) => blockedTrackers.has(trackerId))
	);
	return [...nativeItems, ...relevantLocalItems].toSorted(
		(left, right) => priorityOrder[left.priority] - priorityOrder[right.priority]
	);
}
