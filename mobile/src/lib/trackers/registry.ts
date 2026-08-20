export const trackers = [
	{
		id: 'steps',
		label: 'Steps',
		description: 'Daily steps and Health Connect history.',
		href: '/steps',
		colors: { primary: '#047857', secondary: '#0f766e' },
		defaultEnabled: true
	},
	{
		id: 'sleep',
		label: 'Sleep',
		description: 'Sleep duration, averages, and a daily Health Connect goal.',
		href: '/sleep',
		colors: { primary: '#4338ca', secondary: '#7e22ce' },
		defaultEnabled: true
	},
	{
		id: 'screen-time',
		label: 'Screen time',
		description: 'Daily Android usage and per-app screen-time history.',
		href: '/screen-time',
		colors: { primary: '#1d4ed8', secondary: '#0369a1' },
		defaultEnabled: true
	},
	{
		id: 'fitness',
		label: 'Fitness',
		description: 'Workouts, progress, and exercise preferences.',
		href: '/fitness',
		colors: { primary: '#b91c1c', secondary: '#c2410c' },
		defaultEnabled: true
	},
	{
		id: 'nutrition',
		label: 'Nutrition',
		description: 'Meals, calories, and daily nutrition goals.',
		href: '/nutrition/log/today',
		colors: { primary: '#15803d', secondary: '#4d7c0f' },
		defaultEnabled: true
	},
	{
		id: 'meditation',
		label: 'Meditation',
		description: 'Timed sessions and meditation history.',
		href: '/meditation',
		colors: { primary: '#6d28d9', secondary: '#a21caf' },
		defaultEnabled: true
	},
	{
		id: 'breathing',
		label: 'Breathing',
		description: 'A guided daily 4-7-8 breathing exercise.',
		href: '/breathing',
		colors: { primary: '#0e7490', secondary: '#2563eb' },
		defaultEnabled: true
	},
	{
		id: 'happiness',
		label: 'Happiness',
		description: 'Daily happiness levels and the reasons behind them.',
		href: '/happiness',
		colors: { primary: '#c2410c', secondary: '#a16207' },
		defaultEnabled: true
	},
	{
		id: 'period',
		label: 'Period',
		description: 'Menstruation flow, notes, and recent history.',
		href: '/period',
		colors: { primary: '#be123c', secondary: '#be185d' },
		defaultEnabled: true
	}
] as const;

export type Tracker = (typeof trackers)[number];
export type TrackerId = Tracker['id'];
export type TrackerColors = Tracker['colors'];

export function getTrackerColors(id: TrackerId) {
	return trackers.find((tracker) => tracker.id === id)!.colors;
}

export function getTrackerForPathname(pathname: string) {
	return trackers.find(({ id }) => pathname === `/${id}` || pathname.startsWith(`/${id}/`));
}

export function getTrackerColorsForPathname(pathname: string) {
	return getTrackerForPathname(pathname)?.colors;
}

export function isTrackerId(value: string): value is TrackerId {
	return trackers.some((tracker) => tracker.id === value);
}
