import type { ActionFeedItem } from '$lib/server/action-feed';
import { eatingWindowLabel, type EatingWindow } from './eating-window';

type NutritionActionState = {
	date: string;
	today: string;
	fasting: boolean;
	eatingWindow: EatingWindow | null;
	now: Date;
	timeZone: string;
};

export function getNutritionActions(state: NutritionActionState): ActionFeedItem[] {
	const actions = state.fasting ? [fastingAction(state.date)] : [];
	if (state.date === state.today && state.eatingWindow?.enabled) {
		actions.push(eatingWindowAction(state, state.eatingWindow));
	}
	return actions;
}

function fastingAction(date: string): ActionFeedItem {
	return {
		id: `nutrition:fasting:${date}`,
		trackerIds: ['nutrition'],
		priority: 'activity',
		icon: 'tracker',
		title: 'Full-day fast marked',
		action: { type: 'navigate', href: `/nutrition/log/${date}` }
	};
}

function eatingWindowAction(state: NutritionActionState, window: EatingWindow): ActionFeedItem {
	return {
		id: `nutrition:eating-window:${state.date}`,
		trackerIds: ['nutrition'],
		priority: 'activity',
		icon: 'tracker',
		title: eatingWindowLabel(window, state.now, state.timeZone),
		action: { type: 'navigate', href: '/nutrition/settings' }
	};
}
