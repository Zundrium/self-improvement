import { defineActionCandidate } from '$lib/actions/candidate';
import { trackerStateCondition } from '$lib/actions/conditions';
import { permissionsSettingsHref } from '$lib/permissions';

export const screenTimeActionCandidates = [
	defineActionCandidate({
		id: 'screen-time.missing-measurements',
		trackerIds: ['screen-time'],
		conditions: [trackerStateCondition('screen-time', ({ hasMeasurements }) => !hasMeasurements)],
		resolve(snapshot) {
			const screenTime = snapshot.trackers['screen-time'];
			return {
				instanceId: screenTime.date,
				priority: 'warning',
				score: 90,
				title: 'No screen-time data yet',
				reason: "Sync today's screen time",
				action: { type: 'navigate', href: permissionsSettingsHref('screenTime') }
			};
		}
	}),
	defineActionCandidate({
		id: 'screen-time.limit',
		trackerIds: ['screen-time'],
		conditions: [
			trackerStateCondition(
				'screen-time',
				(screenTime) => screenTime.recorded && screenTime.limitMinutes - screenTime.minutes <= 60
			)
		],
		resolve(snapshot) {
			const screenTime = snapshot.trackers['screen-time'];
			const remaining = screenTime.limitMinutes - screenTime.minutes;
			return {
				instanceId: screenTime.date,
				priority: 'warning',
				score: 80 + Math.min(10, Math.ceil(Math.max(0, -remaining) / 15)),
				title: limitTitle(remaining),
				reason: limitReason(remaining),
				action: { type: 'navigate', href: `/screen-time?date=${screenTime.date}` }
			};
		}
	})
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
