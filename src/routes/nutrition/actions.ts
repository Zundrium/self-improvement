import type { ActionCandidate } from '$lib/actions/contracts';
import { isEatingWindowOpen } from './nutrition';

const MORNING_START = 5 * 60;

export const nutritionActionCandidates: ActionCandidate[] = [
	{
		id: 'nutrition.setup',
		trackerIds: ['nutrition'],
		resolve(snapshot) {
			const nutrition = snapshot.trackers.nutrition;
			if (nutrition.configured) return null;
			return {
				id: 'nutrition.setup',
				priority: 'warning',
				score: 92,
				icon: 'tracker',
				title: 'Set up your nutrition goals',
				reason: 'Set your daily goals',
				action: { type: 'navigate', href: '/nutrition/onboarding' }
			};
		}
	},
	{
		id: 'nutrition.eating-window-upcoming',
		trackerIds: ['nutrition'],
		resolve(snapshot, environment) {
			const nutrition = snapshot.trackers.nutrition;
			if (nutrition.date !== environment.localDate || nutrition.fasting) return null;
			if (!nutrition.eatingWindow) return null;
			const start = minutesFromTime(nutrition.eatingWindow.start);
			if (environment.localMinuteOfDay < MORNING_START || environment.localMinuteOfDay >= start)
				return null;
			return {
				id: `nutrition.eating-window-upcoming:${nutrition.date}`,
				priority: 'activity',
				score: 55,
				icon: 'tracker',
				title: `Eating starts in ${formatMinutes(start - environment.localMinuteOfDay)}`,
				reason: `Your eating window starts at ${nutrition.eatingWindow.start}`,
				action: { type: 'navigate', href: `/nutrition/track?date=${nutrition.date}` }
			};
		}
	},
	{
		id: 'nutrition.eating-window-open',
		trackerIds: ['nutrition'],
		resolve(snapshot, environment) {
			const nutrition = snapshot.trackers.nutrition;
			if (nutrition.date !== environment.localDate || nutrition.fasting) return null;
			if (!nutrition.eatingWindow) return null;
			if (!isEatingWindowOpen(nutrition.eatingWindow, environment.localMinuteOfDay)) return null;
			const end = minutesFromTime(nutrition.eatingWindow.end);
			return {
				id: `nutrition.eating-window-open:${nutrition.date}`,
				priority: 'activity',
				score: 60,
				icon: 'tracker',
				title: 'Add a meal',
				reason: `${formatMinutes(end - environment.localMinuteOfDay)} left in your eating window`,
				action: { type: 'navigate', href: `/nutrition/track?date=${nutrition.date}` }
			};
		}
	},
	{
		id: 'nutrition.full-day-fast',
		trackerIds: ['nutrition'],
		resolve(snapshot) {
			const nutrition = snapshot.trackers.nutrition;
			if (!nutrition.fasting) return null;
			return {
				id: `nutrition.full-day-fast:${nutrition.date}`,
				priority: 'activity',
				score: 35,
				icon: 'tracker',
				title: 'Full-day fast marked',
				reason: "Review today's fast",
				action: { type: 'navigate', href: `/nutrition/log/${nutrition.date}` }
			};
		}
	}
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
