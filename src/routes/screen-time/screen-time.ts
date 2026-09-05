export { formatScreenTime } from '$lib/trackers/formatting';
export const SCREEN_TIME_TOKEN_HEADER = 'X-Screen-Time-Token';
import type { ScreenTimeApp } from '$lib/local/native/screen-time';
export {
	MAX_APPS_PER_DAY,
	MAX_DAILY_MINUTES,
	MAX_SCREEN_TIME_DAYS,
	parseScreenTimePayload,
	type ScreenTimeApp,
	type ScreenTimeDay,
	type ScreenTimePayload
} from '$lib/local/native/screen-time';

export function hasTrackedApps(apps: Array<{ tracked: boolean }>) {
	return apps.some((app) => app.tracked);
}

export function summarizeUsage(days: Array<{ totalMinutes: number }>) {
	const totalMinutes = days.reduce((total, day) => total + day.totalMinutes, 0);
	return {
		totalMinutes,
		averageMinutes: days.length ? Math.round(totalMinutes / days.length) : 0,
		maxMinutes: Math.max(1, ...days.map((day) => day.totalMinutes))
	};
}

export function topApps(apps: ScreenTimeApp[], limit = 8) {
	return [...apps].sort((left, right) => right.minutes - left.minutes).slice(0, limit);
}
