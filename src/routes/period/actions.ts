import { defineActionCandidate } from '$lib/actions/candidate';

export const periodActionCandidates = [
	defineActionCandidate({
		id: 'period.status',
		trackerIds: ['period'],
		resolve(snapshot) {
			const period = snapshot.trackers.period;
			const logged = period.flow !== null;
			return {
				instanceId: period.date,
				fallback: true,
				status: logged ? 'complete' : 'actionable',
				priority: 'activity',
				score: 1,
				title: logged ? 'Period flow logged' : 'Log your period',
				reason: logged ? `Today's flow: ${period.flow}` : "Add today's flow when it applies",
				action: { type: 'navigate', href: `/period?date=${period.date}` }
			};
		}
	})
];
