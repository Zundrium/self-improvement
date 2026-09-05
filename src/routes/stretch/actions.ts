import { defineActionCandidate } from '$lib/actions/candidate';
import { trackerDateIsLocalDate, trackerStateCondition } from '$lib/actions/conditions';

export const stretchActionCandidates = [
	defineActionCandidate({
		id: 'stretch.daily-routine',
		trackerIds: ['stretch'],
		conditions: [
			trackerDateIsLocalDate('stretch'),
			trackerStateCondition('stretch', ({ scheduled, completed }) => scheduled && !completed)
		],
		resolve(snapshot) {
			return {
				instanceId: snapshot.trackers.stretch.date,
				priority: 'activity',
				score: 45,
				title: "Let's stretch now",
				reason: 'A short full-body flexibility routine',
				action: { type: 'navigate', href: '/stretch' }
			};
		}
	})
];
