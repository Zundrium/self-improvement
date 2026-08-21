import type { ActionFeedItem } from '$lib/server/action-feed';

export function getHappinessActions(date: string, recorded: boolean): ActionFeedItem[] {
	if (recorded) return [];
	return [
		{
			id: `happiness:${date}`,
			trackerIds: ['happiness'],
			priority: 'activity',
			icon: 'tracker',
			title: 'How are you feeling today?',
			action: { type: 'navigate', href: '/happiness' }
		}
	];
}
