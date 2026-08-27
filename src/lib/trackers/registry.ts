export const trackers = [
	{
		id: 'steps',
		label: 'Steps',
		description: 'Daily steps and Health Connect history.',
		href: '/steps',
		settingsHref: '/steps/settings',
		colors: { primary: '#047857', secondary: '#0f766e' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'sleep',
		label: 'Sleep',
		description: 'Bedtime adherence from selected Android app activity.',
		href: '/sleep',
		settingsHref: '/sleep/settings',
		colors: { primary: '#4338ca', secondary: '#7e22ce' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'screen-time',
		label: 'Screen time',
		description: 'Daily Android usage and per-app screen-time history.',
		href: '/screen-time',
		settingsHref: '/screen-time/settings',
		colors: { primary: '#1d4ed8', secondary: '#0369a1' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'fitness',
		label: 'Fitness',
		description: 'Workouts, progress, and exercise preferences.',
		href: '/fitness',
		settingsHref: '/fitness/settings',
		colors: { primary: '#b91c1c', secondary: '#c2410c' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'nutrition',
		label: 'Nutrition',
		description: 'Meals, calories, and daily nutrition goals.',
		href: '/nutrition/log/today',
		settingsHref: '/nutrition/settings',
		colors: { primary: '#15803d', secondary: '#4d7c0f' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'meditation',
		label: 'Meditation',
		description: 'Timed sessions and meditation history.',
		href: '/meditation',
		settingsHref: '/meditation/settings',
		colors: { primary: '#6d28d9', secondary: '#a21caf' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'breathing',
		label: 'Breathing',
		description: 'A guided daily 4-7-8 breathing exercise.',
		href: '/breathing',
		settingsHref: '/breathing/settings',
		colors: { primary: '#0e7490', secondary: '#2563eb' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'stretch',
		label: 'Stretch',
		description: 'Daily stretch holds and completion history.',
		href: '/stretch',
		settingsHref: '/stretch/settings',
		infoHref: 'https://www.youtube.com/watch?v=QaKuVOhikaY',
		colors: { primary: '#c2410c', secondary: '#9a3412' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'happiness',
		label: 'Happiness',
		description: 'Daily happiness levels and the reasons behind them.',
		href: '/happiness',
		settingsHref: '/happiness/settings',
		colors: { primary: '#a16207', secondary: '#ca8a04' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'period',
		label: 'Period',
		description: 'Menstruation flow, notes, and recent history.',
		href: '/period',
		settingsHref: '/period/settings',
		colors: { primary: '#be123c', secondary: '#be185d' },
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'achievements',
		label: 'Achievements',
		description: 'Unlocked achievements and personal progress.',
		href: '/achievements',
		settingsHref: null,
		colors: { primary: '#8b5cf6', secondary: '#0d0d0d' },
		hasAppIcon: false
	},
	{
		id: 'streaks',
		label: 'Streaks',
		description: 'Current and best streaks for active trackers.',
		href: '/streaks',
		settingsHref: null,
		colors: { primary: '#f97316', secondary: '#0d0d0d' },
		hasAppIcon: false
	}
] as const;

export type Tracker = (typeof trackers)[number];
export type TrackerId = Tracker['id'];
export type AppTracker = Extract<Tracker, { hasAppIcon: true }>;
export type AppTrackerId = AppTracker['id'];
export type TrackerColors = { primary: string; secondary: string };

export const appTrackers = trackers.filter((tracker): tracker is AppTracker => tracker.hasAppIcon);

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

export function isAppTrackerId(value: string): value is AppTrackerId {
	return appTrackers.some((tracker) => tracker.id === value);
}
