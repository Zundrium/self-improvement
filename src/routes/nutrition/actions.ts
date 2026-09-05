import { defineActionCandidate } from '$lib/actions/candidate';
import {
	localMinuteIsAtLeast,
	trackerDateIsLocalDate,
	trackerStateCondition
} from '$lib/actions/conditions';
import { isEatingWindowOpen } from './nutrition';

const MORNING_START = 5 * 60;

export const nutritionActionCandidates = [
	defineActionCandidate({
		id: 'nutrition.setup',
		trackerIds: ['nutrition'],
		conditions: [trackerStateCondition('nutrition', ({ configured }) => !configured)],
		resolve() {
			return {
				priority: 'warning',
				score: 92,
				title: 'Set up your nutrition goals',
				reason: 'Set your daily goals',
				action: { type: 'navigate', href: '/nutrition/onboarding' }
			};
		}
	}),
	defineActionCandidate({
		id: 'nutrition.eating-window-upcoming',
		trackerIds: ['nutrition'],
		conditions: [
			trackerDateIsLocalDate('nutrition'),
			trackerStateCondition(
				'nutrition',
				(nutrition, environment) =>
					!nutrition.fasting &&
					nutrition.eatingWindow !== null &&
					environment.localMinuteOfDay < minutesFromTime(nutrition.eatingWindow.start)
			),
			localMinuteIsAtLeast(MORNING_START)
		],
		resolve(snapshot, environment) {
			const nutrition = snapshot.trackers.nutrition;
			if (!nutrition.eatingWindow) return null;
			const start = minutesFromTime(nutrition.eatingWindow.start);
			return {
				instanceId: nutrition.date,
				priority: 'activity',
				score: 55,
				title: `Eating starts in ${formatMinutes(start - environment.localMinuteOfDay)}`,
				reason: `Your eating window starts at ${nutrition.eatingWindow.start}`,
				action: { type: 'navigate', href: `/nutrition/track?date=${nutrition.date}` }
			};
		}
	}),
	defineActionCandidate({
		id: 'nutrition.eating-window-open',
		trackerIds: ['nutrition'],
		conditions: [
			trackerDateIsLocalDate('nutrition'),
			trackerStateCondition(
				'nutrition',
				(nutrition, environment) =>
					!nutrition.fasting &&
					nutrition.eatingWindow !== null &&
					isEatingWindowOpen(nutrition.eatingWindow, environment.localMinuteOfDay)
			)
		],
		resolve(snapshot, environment) {
			const nutrition = snapshot.trackers.nutrition;
			if (!nutrition.eatingWindow) return null;
			const end = minutesFromTime(nutrition.eatingWindow.end);
			return {
				instanceId: nutrition.date,
				priority: 'activity',
				score: 60,
				title: 'Add a meal',
				reason: `${formatMinutes(end - environment.localMinuteOfDay)} left in your eating window`,
				action: { type: 'navigate', href: `/nutrition/track?date=${nutrition.date}` }
			};
		}
	}),
	defineActionCandidate({
		id: 'nutrition.full-day-fast',
		trackerIds: ['nutrition'],
		conditions: [trackerStateCondition('nutrition', ({ fasting }) => fasting)],
		resolve(snapshot) {
			const nutrition = snapshot.trackers.nutrition;
			return {
				instanceId: nutrition.date,
				priority: 'activity',
				score: 35,
				title: 'Full-day fast marked',
				reason: "Review today's fast",
				action: { type: 'navigate', href: `/nutrition/log/${nutrition.date}` }
			};
		}
	})
];

function minutesFromTime(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	return hour * 60 + minute;
}

function formatMinutes(totalMinutes: number) {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return [
		hours ? `${hours} hour${hours === 1 ? '' : 's'}` : '',
		minutes ? `${minutes} minute${minutes === 1 ? '' : 's'}` : ''
	]
		.filter(Boolean)
		.join(' ');
}
