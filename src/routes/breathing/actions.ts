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
	}),
	defineActionCandidate({
		id: 'breathing.status',
		trackerIds: ['breathing'],
		resolve(snapshot) {
			const breathing = snapshot.trackers.breathing;
			return {
				instanceId: breathing.date,
				fallback: true,
				status: breathing.completed ? 'complete' : 'actionable',
				priority: 'activity',
				score: 1,
				title: breathing.completed ? 'Breathing exercise complete' : 'Take a breathing break',
				reason: breathing.completed
					? 'Your guided exercise is done for today'
					: 'A guided exercise to feel at ease',
				action: { type: 'navigate', href: `/breathing?date=${breathing.date}` }
			};
		}
	})
];
