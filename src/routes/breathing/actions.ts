import type { ActionCandidate } from '$lib/actions/contracts';
import { BREATHING_DURATION_SECONDS } from './breathing';

export const breathingActionCandidates: ActionCandidate[] = [
	{
		id: 'breathing.daily-exercise',
		trackerIds: ['breathing'],
		resolve(snapshot, environment) {
			const breathing = snapshot.trackers.breathing;
			if (breathing.date !== environment.localDate || breathing.completed) return null;
			return {
				id: `breathing.daily-exercise:${breathing.date}`,
				priority: 'activity',
				score: 40,
				icon: 'tracker',
				title: "Let's breathe now",
				reason: `${Math.ceil(BREATHING_DURATION_SECONDS / 60)} minutes to feel at ease`,
				action: { type: 'navigate', href: '/breathing' }
			};
		}
	}
];
