export type TrackerColors = { primary: string; secondary: string; tertiary: string };

function cssTrackerColors(id: string): TrackerColors {
	return {
		primary: `var(--tracker-${id}-primary)`,
		secondary: `var(--tracker-${id}-secondary)`,
		tertiary: `var(--tracker-${id}-tertiary)`
	};
}

export const trackers = [
	{
		id: 'steps',
		label: 'Steps',
		description: 'Daily steps and Health Connect history.',
		href: '/steps',
		settingsHref: '/steps/settings',
		colors: cssTrackerColors('steps'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'sleep',
		label: 'Sleep',
		description: 'Bedtime adherence from selected Android app activity.',
		href: '/sleep',
		settingsHref: '/sleep/settings',
		colors: cssTrackerColors('sleep'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'screen-time',
		label: 'Screen time',
		description: 'Daily Android usage and per-app screen-time history.',
		href: '/screen-time',
		settingsHref: '/screen-time/settings',
		colors: cssTrackerColors('screen-time'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'fitness',
		label: 'Fitness',
		description: 'Workouts, progress, and exercise preferences.',
		href: '/fitness',
		settingsHref: '/fitness/settings',
		colors: cssTrackerColors('fitness'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'nutrition',
		label: 'Nutrition',
		description: 'Meals, calories, and daily nutrition goals.',
		href: '/nutrition/log/today',
		settingsHref: '/nutrition/settings',
		colors: cssTrackerColors('nutrition'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'meditation',
		label: 'Meditation',
		description: 'Timed sessions and meditation history.',
		href: '/meditation',
		settingsHref: '/meditation/settings',
		colors: cssTrackerColors('meditation'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'breathing',
		label: 'Breathing',
		description: 'A guided daily 4-7-8 breathing exercise.',
		href: '/breathing',
		settingsHref: '/breathing/settings',
		colors: cssTrackerColors('breathing'),
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
		colors: cssTrackerColors('stretch'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'chores',
		label: 'Chores',
		description: 'A daily 10-minute timer for tidying, laundry, or any quick chore.',
		href: '/chores',
		settingsHref: null,
		colors: cssTrackerColors('chores'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'happiness',
		label: 'Happiness',
		description: 'Daily happiness levels and the reasons behind them.',
		href: '/happiness',
		settingsHref: '/happiness/settings',
		colors: cssTrackerColors('happiness'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'period',
		label: 'Period',
		description: 'Menstruation flow, notes, and recent history.',
		href: '/period',
		settingsHref: '/period/settings',
		colors: cssTrackerColors('period'),
		hasAppIcon: true,
		defaultEnabled: true
	},
	{
		id: 'achievements',
		label: 'Achievements',
		description: 'Unlocked achievements and personal progress.',
		href: '/achievements',
		settingsHref: null,
		colors: cssTrackerColors('achievements'),
		hasAppIcon: false
	},
	{
		id: 'streaks',
		label: 'Streaks',
		description: 'Current and best streaks for active trackers.',
		href: '/streaks',
		settingsHref: null,
		colors: cssTrackerColors('streaks'),
		hasAppIcon: false
	}
] as const;

export type Tracker = (typeof trackers)[number];
export type TrackerId = Tracker['id'];
export type AppTracker = Extract<Tracker, { hasAppIcon: true }>;
export type AppTrackerId = AppTracker['id'];
export const appTrackers = trackers.filter((tracker): tracker is AppTracker => tracker.hasAppIcon);

export function getTrackerColors(id: TrackerId) {
	const tracker = trackers.find((tracker) => tracker.id === id);
	if (!tracker) throw new Error(`Unknown tracker: ${id}`);
	return tracker.colors;
}

export function trackerGradient(colors: TrackerColors, angle = 135) {
	return `linear-gradient(${angle}deg, ${colors.primary} 0%, ${colors.secondary} 52%, ${colors.tertiary} 100%)`;
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
