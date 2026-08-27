import type { ActionCandidate } from '$lib/actions/contracts';

export const stepActionCandidates: ActionCandidate[] = [
	{
		id: 'steps.missing-measurements',
		trackerIds: ['steps'],
		resolve(snapshot) {
			const steps = snapshot.trackers.steps;
			if (steps.hasMeasurements) return null;
			return {
				id: `steps.missing-measurements:${steps.date}`,
				priority: 'warning',
				score: 100,
				icon: 'tracker',
				title: 'No step data yet',
				reason: "Sync today's movement",
				action: { type: 'navigate', href: '/android-data-help/steps' }
			};
		}
	}
];
