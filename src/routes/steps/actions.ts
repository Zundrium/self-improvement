import { defineActionCandidate } from '$lib/actions/candidate';
import { trackerStateCondition } from '$lib/actions/conditions';
import { permissionsSettingsHref } from '$lib/permissions';

export const stepActionCandidates = [
	defineActionCandidate({
		id: 'steps.missing-measurements',
		trackerIds: ['steps'],
		conditions: [trackerStateCondition('steps', ({ hasMeasurements }) => !hasMeasurements)],
		resolve(snapshot) {
			const steps = snapshot.trackers.steps;
			return {
				instanceId: steps.date,
				priority: 'warning',
				score: 100,
				title: 'No step data yet',
				reason: "Sync today's movement",
				action: { type: 'navigate', href: permissionsSettingsHref('steps') }
			};
		}
	})
];
