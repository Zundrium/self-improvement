import type { ActionCandidate } from '$lib/actions/contracts';
import { CHORES_DURATION_SECONDS } from './chores';

export const choresActionCandidates: ActionCandidate[] = [
	{
		id: 'chores.daily-reset',
		trackerIds: ['chores'],
		resolve(snapshot, environment) {
			const chores = snapshot.trackers.chores;
			if (chores.date !== environment.localDate || chores.completed) return null;
			return {
				id: `chores.daily-reset:${chores.date}`,
				priority: 'activity',
				score: 35,
				icon: 'tracker',
				title: 'Take 10 minutes to reset',
				reason: `${CHORES_DURATION_SECONDS / 60} minutes for any quick chore`,
				action: { type: 'navigate', href: '/chores' }
			};
		}
	}
];
