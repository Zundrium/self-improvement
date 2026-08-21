import type { ActionFeedItem } from '$lib/server/action-feed';

type FitnessActionState = { date: string; done: boolean; workoutTitle: string };

export function getFitnessActions(state: FitnessActionState): ActionFeedItem[] {
	if (state.done || state.workoutTitle === 'Rest day') return [];
	return [
		{
			id: `fitness:workout:${state.date}`,
			trackerIds: ['fitness'],
			priority: 'activity',
			icon: 'tracker',
			title: `Today's workout: ${state.workoutTitle}`,
			action: { type: 'navigate', href: '/fitness' }
		}
	];
}
