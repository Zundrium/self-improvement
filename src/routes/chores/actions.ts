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
	}),
	defineActionCandidate({
		id: 'chores.status',
		trackerIds: ['chores'],
		resolve(snapshot) {
			const chores = snapshot.trackers.chores;
			return {
				instanceId: chores.date,
				fallback: true,
				status: chores.completed ? 'complete' : 'actionable',
				priority: 'activity',
				score: 1,
				title: chores.completed ? 'Daily reset complete' : 'Take 10 minutes to reset',
				reason: chores.completed
					? 'Your quick chore is done for today'
					: `${CHORES_DURATION_SECONDS / 60} minutes for any quick chore`,
				action: { type: 'navigate', href: `/chores?date=${chores.date}` }
			};
		}
	})
];
