import { defineActionCandidate } from '$lib/actions/candidate';
import { trackerDateIsLocalDate, trackerStateCondition } from '$lib/actions/conditions';

export const sleepActionCandidates = [
	defineActionCandidate({
		id: 'sleep.setup',
		trackerIds: ['sleep'],
		conditions: [trackerStateCondition('sleep', ({ setupRequired }) => setupRequired)],
		resolve() {
			return {
				priority: 'warning',
				score: 95,
				title: 'Choose apps for bedtime tracking',
				reason: 'Choose bedtime apps',
				action: { type: 'navigate', href: '/screen-time' }
			};
		}
	}),
	defineActionCandidate({
		id: 'sleep.late-usage',
		trackerIds: ['sleep'],
		conditions: [
			trackerStateCondition(
				'sleep',
				({ setupRequired, status }) => !setupRequired && status === 'fail'
			)
		],
		resolve(snapshot) {
			const sleep = snapshot.trackers.sleep;
			return {
				instanceId: sleep.date,
				priority: 'warning',
				score: 85,
				title: `${Math.ceil(sleep.lateUsageSeconds / 60)} min of selected-app activity after bedtime`,
				reason: 'Review late activity',
				action: { type: 'navigate', href: `/sleep?date=${sleep.date}` }
			};
		}
	}),
	defineActionCandidate({
		id: 'sleep.bedtime',
		trackerIds: ['sleep'],
		conditions: [
			trackerDateIsLocalDate('sleep'),
			trackerStateCondition(
				'sleep',
				({ setupRequired, status }) => !setupRequired && status === 'pending'
			)
		],
		resolve(snapshot) {
			const sleep = snapshot.trackers.sleep;
			return {
				instanceId: sleep.date,
				priority: 'activity',
				score: 45,
				title: `Bedtime at ${sleep.bedtime}`,
				reason: 'Wind down for better rest',
				action: { type: 'navigate', href: '/sleep' }
			};
		}
	})
];
