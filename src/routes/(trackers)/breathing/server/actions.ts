import type { ActionFeedItem } from '$lib/server/action-feed';

export function getBreathingActions(date: string, done: boolean): ActionFeedItem[] {
	if (done) return [];
	return [
		{
			id: `breathing:${date}`,
			trackerIds: ['breathing'],
			priority: 'activity',
			icon: 'tracker',
			title: 'Breathing exercise is still open',
			action: { type: 'navigate', href: '/breathing' }
		}
	];
}
