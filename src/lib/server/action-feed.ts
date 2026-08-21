import type { AppTrackerId } from '$lib/trackers/registry';

export type ActionPriority = 'blocking' | 'warning' | 'activity';
export type ActionIcon = 'tracker' | 'permission' | 'sync';

export type ActionFeedItem = {
	id: string;
	trackerIds: AppTrackerId[];
	priority: ActionPriority;
	icon: ActionIcon;
	title: string;
	action: { type: 'navigate'; href: string };
};

const priorityOrder: Record<ActionPriority, number> = {
	blocking: 0,
	warning: 1,
	activity: 2
};

export function sortActionFeed(items: ActionFeedItem[]) {
	return items.toSorted(
		(left, right) => priorityOrder[left.priority] - priorityOrder[right.priority]
	);
}
