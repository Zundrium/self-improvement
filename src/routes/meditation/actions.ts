import type { ActionCandidate } from '$lib/actions/contracts';
import { DEFAULT_DURATION_SECONDS } from './meditation';

export const meditationActionCandidates: ActionCandidate[] = [
	{
		id: 'meditation.restart',
		trackerIds: ['meditation'],
		resolve(snapshot, environment) {
			const meditation = snapshot.trackers.meditation;
			if (meditation.date !== environment.localDate || meditation.completed) return null;
			if (meditation.daysSinceLastSession === null || meditation.daysSinceLastSession < 5)
				return null;
			return {
				id: `meditation.restart:${meditation.date}`,
				goalId: `meditation.daily-session:${meditation.date}`,
				priority: 'activity',
				score: 65,
				icon: 'tracker',
				title: 'Ease back into meditation',
				reason: '1 minute to feel rested',
				action: { type: 'navigate', href: '/meditation?duration=60' }
			};
		}
	},
	{
		id: 'meditation.daily-session',
		trackerIds: ['meditation'],
		resolve(snapshot, environment) {
			const meditation = snapshot.trackers.meditation;
			if (meditation.date !== environment.localDate || meditation.completed) return null;
			return {
				id: `meditation.daily-session:${meditation.date}`,
				goalId: `meditation.daily-session:${meditation.date}`,
				priority: 'activity',
				score: 50,
				icon: 'tracker',
				title: "Let's meditate now",
				reason: `${DEFAULT_DURATION_SECONDS / 60} minutes to feel rested`,
				action: { type: 'navigate', href: '/meditation' }
			};
		}
	}
];
