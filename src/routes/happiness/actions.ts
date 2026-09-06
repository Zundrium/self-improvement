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
	}),
	defineActionCandidate({
		id: 'happiness.status',
		trackerIds: ['happiness'],
		resolve(snapshot) {
			const happiness = snapshot.trackers.happiness;
			const complete = happiness.rating !== null;
			return {
				instanceId: happiness.date,
				fallback: true,
				status: complete ? 'complete' : 'actionable',
				priority: 'activity',
				score: 1,
				title: complete ? 'Happiness check-in complete' : 'How are you feeling today?',
				reason: complete
					? `You rated today ${happiness.rating} out of 5`
					: '15 seconds to check in with yourself',
				action: { type: 'navigate', href: `/happiness?date=${happiness.date}` }
			};
		}
	})
];
