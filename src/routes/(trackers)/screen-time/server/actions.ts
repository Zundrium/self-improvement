import type { ActionFeedItem } from '$lib/server/action-feed';
import { formatScreenTime } from '../screen-time';

type ScreenTimeActionState = {
	date: string;
	minutes: number;
	limitMinutes: number;
	recorded: boolean;
	hasMeasurements: boolean;
};

export function getScreenTimeActions(state: ScreenTimeActionState): ActionFeedItem[] {
	if (!state.hasMeasurements) return [missingDataAction()];
	if (!state.recorded) return [];
	const remainingMinutes = state.limitMinutes - state.minutes;
	if (remainingMinutes > 60) return [];
	return [screenTimeWarning(state, remainingMinutes)];
}

function missingDataAction(): ActionFeedItem {
	return {
		id: 'screen-time:no-measurements',
		trackerIds: ['screen-time'],
		priority: 'warning',
		icon: 'tracker',
		title: 'No screen-time data yet',
		action: { type: 'navigate', href: '/android-data-help/screen-time' }
	};
}

function screenTimeWarning(state: ScreenTimeActionState, remaining: number): ActionFeedItem {
	return {
		id: `screen-time:${remaining > 0 ? 'remaining' : 'over-limit'}:${state.date}`,
		trackerIds: ['screen-time'],
		priority: 'warning',
		icon: 'tracker',
		title: screenTimeTitle(remaining),
		action: { type: 'navigate', href: '/screen-time' }
	};
}

function screenTimeTitle(remaining: number) {
	if (remaining > 0) return `Only ${formatScreenTime(remaining)} of screen time left`;
	if (remaining === 0) return 'Screen-time limit reached';
	return `Screen-time limit exceeded by ${formatScreenTime(-remaining)}`;
}
