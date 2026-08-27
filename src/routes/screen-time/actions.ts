import type { ActionCandidate } from '$lib/actions/contracts';

export const screenTimeActionCandidates: ActionCandidate[] = [
	{
		id: 'screen-time.missing-measurements',
		trackerIds: ['screen-time'],
		resolve(snapshot) {
			const screenTime = snapshot.trackers['screen-time'];
			if (screenTime.hasMeasurements) return null;
			return {
				id: `screen-time.missing-measurements:${screenTime.date}`,
				priority: 'warning',
				score: 90,
				icon: 'tracker',
				title: 'No screen-time data yet',
				reason: "Sync today's screen time",
				action: { type: 'navigate', href: '/android-data-help/screen-time' }
			};
		}
	},
	{
		id: 'screen-time.limit',
		trackerIds: ['screen-time'],
		resolve(snapshot) {
			const screenTime = snapshot.trackers['screen-time'];
			if (!screenTime.recorded) return null;
			const remaining = screenTime.limitMinutes - screenTime.minutes;
			if (remaining > 60) return null;
			return {
				id: `screen-time.limit:${screenTime.date}`,
				priority: 'warning',
				score: 80 + Math.min(10, Math.ceil(Math.max(0, -remaining) / 15)),
				icon: 'tracker',
				title: limitTitle(remaining),
				reason: limitReason(remaining),
				action: { type: 'navigate', href: `/screen-time?date=${screenTime.date}` }
			};
		}
	}
];

function limitTitle(remaining: number) {
	if (remaining > 0) return `Only ${remaining}m of screen time left`;
	if (remaining === 0) return 'Screen-time limit reached';
	return `Screen-time limit exceeded by ${-remaining}m`;
}

function limitReason(remaining: number) {
	if (remaining > 0) return 'Take a short screen break';
	return 'Step away and reset';
}
