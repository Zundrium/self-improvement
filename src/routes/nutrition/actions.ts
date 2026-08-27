import type { ActionCandidate } from '$lib/actions/contracts';

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
