import { defineActionCandidate } from '$lib/actions/candidate';
import { trackerDateIsLocalDate, trackerStateCondition } from '$lib/actions/conditions';
import { CHORES_DURATION_SECONDS } from './chores';

export const choresActionCandidates = [
	defineActionCandidate({
		id: 'chores.daily-reset',
		trackerIds: ['chores'],
		conditions: [
			trackerDateIsLocalDate('chores'),
			trackerStateCondition('chores', ({ completed }) => !completed)
		],
		resolve(snapshot) {
			return {
				instanceId: snapshot.trackers.chores.date,
				priority: 'activity',
				score: 35,
				title: 'Take 10 minutes to reset',
				reason: `${CHORES_DURATION_SECONDS / 60} minutes for any quick chore`,
				action: { type: 'navigate', href: '/chores' }
			};
		}
	})
];
