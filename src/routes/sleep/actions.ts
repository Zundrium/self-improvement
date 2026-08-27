import type { ActionCandidate } from '$lib/actions/contracts';

export const sleepActionCandidates: ActionCandidate[] = [
	{
		id: 'sleep.setup',
		trackerIds: ['sleep'],
		resolve(snapshot) {
			const sleep = snapshot.trackers.sleep;
			if (!sleep.setupRequired) return null;
			return {
				id: 'sleep.setup',
				priority: 'warning',
				score: 95,
				icon: 'tracker',
				title: 'Choose apps for bedtime tracking',
				reason: 'Choose bedtime apps',
				action: { type: 'navigate', href: '/screen-time' }
			};
		}
	},
	{
		id: 'sleep.late-usage',
		trackerIds: ['sleep'],
		resolve(snapshot) {
			const sleep = snapshot.trackers.sleep;
			if (sleep.setupRequired || sleep.status !== 'fail') return null;
			return {
				id: `sleep.late-usage:${sleep.date}`,
				priority: 'warning',
				score: 85,
				icon: 'tracker',
				title: `${Math.ceil(sleep.lateUsageSeconds / 60)} min of selected-app activity after bedtime`,
				reason: 'Review late activity',
				action: { type: 'navigate', href: `/sleep?date=${sleep.date}` }
			};
		}
	},
	{
		id: 'sleep.bedtime',
		trackerIds: ['sleep'],
		resolve(snapshot, environment) {
			const sleep = snapshot.trackers.sleep;
			if (sleep.date !== environment.localDate) return null;
			if (sleep.setupRequired || sleep.status !== 'pending') return null;
			return {
				id: `sleep.bedtime:${sleep.date}`,
				priority: 'activity',
				score: 45,
				icon: 'tracker',
				title: `Bedtime at ${sleep.bedtime}`,
				reason: 'Wind down for better rest',
				action: { type: 'navigate', href: '/sleep' }
			};
		}
	}
];
