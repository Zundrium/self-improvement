import { defineActionCandidate } from '$lib/actions/candidate';
import { trackerDateIsLocalDate, trackerStateCondition } from '$lib/actions/conditions';

export const breathingActionCandidates = [
	defineActionCandidate({
		id: 'breathing.daily-exercise',
		trackerIds: ['breathing'],
		conditions: [
			trackerDateIsLocalDate('breathing'),
			trackerStateCondition('breathing', ({ completed }) => !completed)
		],
		resolve(snapshot) {
			return {
				instanceId: snapshot.trackers.breathing.date,
				priority: 'activity',
				score: 40,
				title: "Let's breathe now",
				reason: 'A guided exercise to feel at ease',
				action: { type: 'navigate', href: '/breathing' }
			};
		}
	})
];
