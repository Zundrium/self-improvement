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
	}),
	defineActionCandidate({
		id: 'nutrition.status',
		trackerIds: ['nutrition'],
		resolve(snapshot) {
			const nutrition = snapshot.trackers.nutrition;
			if (!nutrition.configured) {
				return statusResolution(
					nutrition.date,
					'actionable',
					'Set up your nutrition goals',
					'Set your daily goals',
					'/nutrition/onboarding'
				);
			}
			if (nutrition.fasting) {
				return statusResolution(
					nutrition.date,
					'tracking',
					'Full-day fast marked',
					nutrition.hasEntries ? 'Review food logged during your fast' : "Review today's fast",
					`/nutrition/log/${nutrition.date}`
				);
			}
			if (!nutrition.hasEntries || nutrition.calorieGoal === null) {
				return statusResolution(
					nutrition.date,
					'actionable',
					'Log a meal',
					nutrition.calorieGoal === null
						? 'Set a calorie goal, then log your meals'
						: 'Add a meal to track your daily goal',
					`/nutrition/track?date=${nutrition.date}`
				);
			}
			const difference = nutrition.calories - nutrition.calorieGoal;
			if (difference > 0) {
				return statusResolution(
					nutrition.date,
					'attention',
					`${difference.toLocaleString()} calories over your goal`,
					`${nutrition.calories.toLocaleString()} of ${nutrition.calorieGoal.toLocaleString()} calories`,
					`/nutrition/log/${nutrition.date}`
				);
			}
			if (difference === 0) {
				return statusResolution(
					nutrition.date,
					'complete',
					'Calorie goal reached',
					`${nutrition.calories.toLocaleString()} calories logged`,
					`/nutrition/log/${nutrition.date}`
				);
			}
			return statusResolution(
				nutrition.date,
				'actionable',
				`${(-difference).toLocaleString()} calories left`,
				`${nutrition.calories.toLocaleString()} of ${nutrition.calorieGoal.toLocaleString()} calories`,
				`/nutrition/track?date=${nutrition.date}`
			);
		}
	})
];

function statusResolution(
	date: string,
	status: 'actionable' | 'complete' | 'attention' | 'tracking',
	title: string,
	reason: string,
	href: string
) {
	return {
		instanceId: date,
		fallback: true,
		status,
		priority: 'activity' as const,
		score: 1,
		title,
		reason,
		action: { type: 'navigate' as const, href }
	};
}

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
