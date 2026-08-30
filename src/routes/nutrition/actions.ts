import type { ActionCandidate } from '$lib/actions/contracts';
import { isEatingWindowOpen } from './nutrition';

export const nutritionActionCandidates: ActionCandidate[] = [
	{
		id: 'nutrition.setup',
		trackerIds: ['nutrition'],
		resolve(snapshot) {
			const nutrition = snapshot.trackers.nutrition;
			if (nutrition.configured) return null;
			return {
				id: 'nutrition.setup',
				priority: 'warning',
				score: 92,
				icon: 'tracker',
				title: 'Set up your nutrition goals',
				reason: 'Set your daily goals',
				action: { type: 'navigate', href: '/nutrition/onboarding' }
			};
		}
	},
	{
		id: 'nutrition.eating-window-open',
		trackerIds: ['nutrition'],
		resolve(snapshot, environment) {
			const nutrition = snapshot.trackers.nutrition;
			if (nutrition.date !== environment.localDate || nutrition.fasting) return null;
			if (!nutrition.eatingWindow) return null;
			if (!isEatingWindowOpen(nutrition.eatingWindow, environment.localMinuteOfDay)) return null;
			return {
				id: `nutrition.eating-window-open:${nutrition.date}`,
				priority: 'activity',
				score: 60,
				icon: 'tracker',
				title: 'Add a meal',
				reason: 'Your eating window is open',
				action: { type: 'navigate', href: `/nutrition/track?date=${nutrition.date}` }
			};
		}
	},
	{
		id: 'nutrition.full-day-fast',
		trackerIds: ['nutrition'],
		resolve(snapshot) {
			const nutrition = snapshot.trackers.nutrition;
			if (!nutrition.fasting) return null;
			return {
				id: `nutrition.full-day-fast:${nutrition.date}`,
				priority: 'activity',
				score: 35,
				icon: 'tracker',
				title: 'Full-day fast marked',
				reason: "Review today's fast",
				action: { type: 'navigate', href: `/nutrition/log/${nutrition.date}` }
			};
		}
	}
];
