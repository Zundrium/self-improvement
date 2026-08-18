export const trackers = [
	{
		id: 'steps',
		label: 'Steps',
		description: 'Daily steps and Health Connect history.',
		href: '/steps',
		defaultEnabled: true
	},
	{
		id: 'sleep',
		label: 'Sleep',
		description: 'Sleep duration, averages, and a daily Health Connect goal.',
		href: '/sleep',
		defaultEnabled: true
	},
	{
		id: 'screen-time',
		label: 'Screen time',
		description: 'Daily Android usage and per-app screen-time history.',
		href: '/screen-time',
		defaultEnabled: true
	},
	{
		id: 'fitness',
		label: 'Fitness',
		description: 'Workouts, progress, and exercise preferences.',
		href: '/fitness',
		defaultEnabled: true
	},
	{
		id: 'nutrition',
		label: 'Nutrition',
		description: 'Meals, calories, and daily nutrition goals.',
		href: '/nutrition/log/today',
		defaultEnabled: true
	},
	{
		id: 'meditation',
		label: 'Meditation',
		description: 'Timed sessions and meditation history.',
		href: '/meditation',
		defaultEnabled: true
	},
	{
		id: 'breathing',
		label: 'Breathing',
		description: 'A guided daily 4-7-8 breathing exercise.',
		href: '/breathing',
		defaultEnabled: true
	},
	{
		id: 'happiness',
		label: 'Happiness',
		description: 'Daily happiness levels and the reasons behind them.',
		href: '/happiness',
		defaultEnabled: true
	},
	{
		id: 'period',
		label: 'Period',
		description: 'Menstruation flow, notes, and recent history.',
		href: '/period',
		defaultEnabled: true
	}
] as const;

export type Tracker = (typeof trackers)[number];
export type TrackerId = Tracker['id'];

export function isTrackerId(value: string): value is TrackerId {
	return trackers.some((tracker) => tracker.id === value);
}
