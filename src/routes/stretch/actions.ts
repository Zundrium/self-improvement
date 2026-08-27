import type { ActionCandidate } from '$lib/actions/contracts';

export const stretchActionCandidates: ActionCandidate[] = [
	{
		id: 'stretch.daily-routine',
		trackerIds: ['stretch'],
		resolve(snapshot, environment) {
			const stretch = snapshot.trackers.stretch;
			if (stretch.date !== environment.localDate || !stretch.scheduled || stretch.completed)
				return null;
			return {
				id: `stretch.daily-routine:${stretch.date}`,
				priority: 'activity',
				score: 45,
				icon: 'tracker',
				title: "Let's stretch now",
				reason: 'A short full-body flexibility routine',
				action: { type: 'navigate', href: '/stretch' }
			};
		}
	}
];
