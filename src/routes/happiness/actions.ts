import { defineActionCandidate } from '$lib/actions/candidate';
import { trackerDateIsLocalDate, trackerStateCondition } from '$lib/actions/conditions';

export const happinessActionCandidates = [
	defineActionCandidate({
		id: 'happiness.daily-check-in',
		trackerIds: ['happiness'],
		conditions: [
			trackerDateIsLocalDate('happiness'),
			trackerStateCondition('happiness', ({ rating }) => rating === null)
		],
		resolve(snapshot) {
			return {
				instanceId: snapshot.trackers.happiness.date,
				priority: 'activity',
				score: 55,
				title: 'How are you feeling today?',
				reason: '15 seconds to check in with yourself',
				action: { type: 'navigate', href: '/happiness' }
			};
		}
	})
];
