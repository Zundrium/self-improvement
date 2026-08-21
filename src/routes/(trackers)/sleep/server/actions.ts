import type { ActionFeedItem } from '$lib/server/action-feed';

export function getSleepActions(hasMeasurements: boolean): ActionFeedItem[] {
	if (hasMeasurements) return [];
	return [
		{
			id: 'sleep:no-measurements',
			trackerIds: ['sleep'],
			priority: 'warning',
			icon: 'tracker',
			title: 'No sleep measured yet',
			action: { type: 'navigate', href: '/android-data-help/sleep' }
		}
	];
}
