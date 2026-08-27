import type { ActionCandidate } from '$lib/actions/contracts';

export const happinessActionCandidates: ActionCandidate[] = [
	{
		id: 'happiness.daily-check-in',
		trackerIds: ['happiness'],
		resolve(snapshot, environment) {
			const happiness = snapshot.trackers.happiness;
			if (happiness.date !== environment.localDate || happiness.rating !== null) return null;
			return {
				id: `happiness.daily-check-in:${happiness.date}`,
				priority: 'activity',
				score: 55,
				icon: 'tracker',
				title: 'How are you feeling today?',
				reason: '15 seconds to check in with yourself',
				action: { type: 'navigate', href: '/happiness' }
			};
		}
	}
];
