import type { SleepAdherenceStatus } from '$lib/server/db/trackers/sleep';
import type { ActionFeedItem } from '$lib/server/action-feed';

type SleepActionState = {
	date: string;
	status: SleepAdherenceStatus;
	bedtime: string;
	lateUsageSeconds: number;
	setupRequired: boolean;
};

export function getSleepActions(state: SleepActionState): ActionFeedItem[] {
	if (state.setupRequired) return [setupAction()];
	if (state.status === 'pass') return [];
	if (state.status === 'fail') return [failedAction(state)];
	return [pendingAction(state)];
}

function setupAction(): ActionFeedItem {
	return {
		id: 'sleep:select-apps',
		trackerIds: ['sleep'],
		priority: 'warning',
		icon: 'tracker',
		title: 'Choose apps for bedtime tracking',
		action: { type: 'navigate', href: '/screen-time' }
	};
}

function failedAction(state: SleepActionState): ActionFeedItem {
	return {
		id: `sleep:late-usage:${state.date}`,
		trackerIds: ['sleep'],
		priority: 'warning',
		icon: 'tracker',
		title: `${formatMinutes(state.lateUsageSeconds)} of selected-app activity after bedtime`,
		action: { type: 'navigate', href: '/sleep' }
	};
}

function pendingAction(state: SleepActionState): ActionFeedItem {
	return {
		id: `sleep:bedtime:${state.date}`,
		trackerIds: ['sleep'],
		priority: 'activity',
		icon: 'tracker',
		title: `Bedtime at ${state.bedtime}`,
		action: { type: 'navigate', href: '/sleep' }
	};
}

function formatMinutes(seconds: number) {
	const minutes = Math.ceil(seconds / 60);
	return `${minutes} min`;
}
