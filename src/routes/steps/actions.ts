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
	}),
	defineActionCandidate({
		id: 'steps.status',
		trackerIds: ['steps'],
		resolve(snapshot) {
			const steps = snapshot.trackers.steps;
			const remaining = steps.goal - steps.steps;
			if (!steps.hasMeasurements) {
				return {
					instanceId: steps.date,
					fallback: true,
					status: 'actionable',
					priority: 'activity',
					score: 1,
					title: 'No step data yet',
					reason: "Sync today's movement",
					action: { type: 'navigate', href: permissionsSettingsHref('steps') }
				};
			}
			return {
				instanceId: steps.date,
				fallback: true,
				status: remaining <= 0 ? 'complete' : 'actionable',
				priority: 'activity',
				score: 1,
				title:
					remaining < 0
						? `${(-remaining).toLocaleString()} steps over your goal`
						: remaining === 0
							? 'Step goal reached'
							: `${remaining.toLocaleString()} steps left`,
				reason: `${steps.steps.toLocaleString()} of ${steps.goal.toLocaleString()} steps`,
				action: { type: 'navigate', href: `/steps?date=${steps.date}` }
			};
		}
	})
];
