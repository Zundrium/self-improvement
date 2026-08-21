export const trackers = [
	{
		id: 'steps',
		label: 'Steps',
		description: 'Daily steps and Health Connect history.',
		href: '/steps',
		colors: { primary: '#047857', secondary: '#0f766e' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'sleep',
		label: 'Sleep',
		description: 'Sleep duration, averages, and a daily Health Connect goal.',
		href: '/sleep',
		colors: { primary: '#4338ca', secondary: '#7e22ce' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'screen-time',
		label: 'Screen time',
		description: 'Daily Android usage and per-app screen-time history.',
		href: '/screen-time',
		colors: { primary: '#1d4ed8', secondary: '#0369a1' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'fitness',
		label: 'Fitness',
		description: 'Workouts, progress, and exercise preferences.',
		href: '/fitness',
		colors: { primary: '#b91c1c', secondary: '#c2410c' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'nutrition',
		label: 'Nutrition',
		description: 'Meals, calories, and daily nutrition goals.',
		href: '/nutrition/log/today',
		colors: { primary: '#15803d', secondary: '#4d7c0f' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'meditation',
		label: 'Meditation',
		description: 'Timed sessions and meditation history.',
		href: '/meditation',
		colors: { primary: '#6d28d9', secondary: '#a21caf' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'breathing',
		label: 'Breathing',
		description: 'A guided daily 4-7-8 breathing exercise.',
		href: '/breathing',
		colors: { primary: '#0e7490', secondary: '#2563eb' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'happiness',
		label: 'Happiness',
		description: 'Daily happiness levels and the reasons behind them.',
		href: '/happiness',
		colors: { primary: '#c2410c', secondary: '#a16207' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'period',
		label: 'Period',
		description: 'Menstruation flow, notes, and recent history.',
		href: '/period',
		colors: { primary: '#be123c', secondary: '#be185d' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'achievements',
		label: 'Achievements',
		description: 'Unlocked achievements and personal progress.',
		href: '/achievements',
		colors: { primary: '#8b5cf6', secondary: '#0d0d0d' },
		hasAppIcon: false
	},
	{
		id: 'streaks',
		label: 'Streaks',
		description: 'Current and best streaks for active trackers.',
		href: '/streaks',
		colors: { primary: '#f97316', secondary: '#0d0d0d' },
		hasAppIcon: false
	}
] as const;

export type Tracker = (typeof trackers)[number];
export type TrackerId = Tracker['id'];
export type AppTracker = Extract<Tracker, { hasAppIcon: true }>;
export type AppTrackerId = AppTracker['id'];
export type TrackerColors = Tracker['colors'];

export const appTrackers = trackers.filter((tracker): tracker is AppTracker => tracker.hasAppIcon);

export function isTrackerId(value: string): value is TrackerId {
	return trackers.some((tracker) => tracker.id === value);
}

export function isAppTrackerId(value: string): value is AppTrackerId {
	return appTrackers.some((tracker) => tracker.id === value);
}
