import { defineActionCandidate } from '$lib/actions/candidate';
import { trackerDateIsLocalDate, trackerStateCondition } from '$lib/actions/conditions';
import { DEFAULT_DURATION_SECONDS } from './meditation';

export const meditationActionCandidates = [
	defineActionCandidate({
		id: 'meditation.restart',
		trackerIds: ['meditation'],
		conditions: [
			trackerDateIsLocalDate('meditation'),
			trackerStateCondition(
				'meditation',
				({ completed, daysSinceLastSession }) =>
					!completed && daysSinceLastSession !== null && daysSinceLastSession >= 5
			)
		],
		resolve(snapshot) {
			const meditation = snapshot.trackers.meditation;
			return {
				instanceId: meditation.date,
				goalId: `meditation.daily-session:${meditation.date}`,
				priority: 'activity',
				score: 65,
				title: 'Ease back into meditation',
				reason: '1 minute to feel rested',
				action: { type: 'navigate', href: '/meditation?duration=60' }
			};
		}
	}),
	defineActionCandidate({
		id: 'meditation.daily-session',
		trackerIds: ['meditation'],
		conditions: [
			trackerDateIsLocalDate('meditation'),
			trackerStateCondition('meditation', ({ completed }) => !completed)
		],
		resolve(snapshot) {
			const meditation = snapshot.trackers.meditation;
			return {
				instanceId: meditation.date,
				goalId: `meditation.daily-session:${meditation.date}`,
				priority: 'activity',
				score: 50,
				title: "Let's meditate now",
				reason: `${DEFAULT_DURATION_SECONDS / 60} minutes to feel rested`,
				action: { type: 'navigate', href: '/meditation' }
			};
		}
	}),
	defineActionCandidate({
		id: 'meditation.status',
		trackerIds: ['meditation'],
		resolve(snapshot) {
			const meditation = snapshot.trackers.meditation;
			return {
				instanceId: meditation.date,
				fallback: true,
				status: meditation.completed ? 'complete' : 'actionable',
				priority: 'activity',
				score: 1,
				title: meditation.completed ? 'Meditation complete' : 'Meditate today',
				reason: meditation.completed
					? 'Your session is complete for today'
					: `${DEFAULT_DURATION_SECONDS / 60} minutes to feel rested`,
				action: { type: 'navigate', href: `/meditation?date=${meditation.date}` }
			};
		}
	})
];
