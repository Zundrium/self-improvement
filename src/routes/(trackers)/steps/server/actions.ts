import type { ActionFeedItem } from '$lib/server/action-feed';

export function getStepActions(hasMeasurements: boolean): ActionFeedItem[] {
	if (hasMeasurements) return [];
	return [
		{
			id: 'steps:no-measurements',
			trackerIds: ['steps'],
			priority: 'warning',
			icon: 'tracker',
			title: 'No step data yet',
			action: { type: 'navigate', href: '/android-data-help/steps' }
		}
	];
}
