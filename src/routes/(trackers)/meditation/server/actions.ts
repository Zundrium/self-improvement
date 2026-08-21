import type { ActionFeedItem } from '$lib/server/action-feed';

export function getMeditationActions(date: string, done: boolean): ActionFeedItem[] {
	if (done) return [];
	return [
		{
			id: `meditation:${date}`,
			trackerIds: ['meditation'],
			priority: 'activity',
			icon: 'tracker',
			title: 'Meditation is still open',
			action: { type: 'navigate', href: '/meditation' }
		}
	];
}
