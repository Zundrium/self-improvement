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
	}),
	defineActionCandidate({
		id: 'stretch.status',
		trackerIds: ['stretch'],
		resolve(snapshot) {
			const stretch = snapshot.trackers.stretch;
			return {
				instanceId: stretch.date,
				fallback: true,
				status: !stretch.scheduled ? 'rest' : stretch.completed ? 'complete' : 'actionable',
				priority: 'activity',
				score: 1,
				title: !stretch.scheduled
					? 'Rest day'
					: stretch.completed
						? 'Stretch routine complete'
						: 'Stretch routine ready',
				reason: !stretch.scheduled
					? 'No stretch routine is scheduled today'
					: stretch.completed
						? 'Your flexibility work is done for today'
						: 'A short full-body flexibility routine',
				action: { type: 'navigate', href: `/stretch?date=${stretch.date}` }
			};
		}
	})
];
