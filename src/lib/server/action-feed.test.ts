import { describe, expect, it } from 'vitest';
import { sortActionFeed, type ActionFeedItem } from './action-feed';
import { getBreathingActions } from '../../routes/(trackers)/breathing/server/actions';
import { getFitnessActions } from '../../routes/(trackers)/fitness/server/actions';
import { getHappinessActions } from '../../routes/(trackers)/happiness/server/actions';
import { getMeditationActions } from '../../routes/(trackers)/meditation/server/actions';
import { getNutritionActions } from '../../routes/(trackers)/nutrition/server/actions';
import { getScreenTimeActions } from '../../routes/(trackers)/screen-time/server/actions';
import { getSleepActions } from '../../routes/(trackers)/sleep/server/actions';

const date = '2026-08-20';

describe('tracker action providers', () => {
	it('creates only unfinished daily activities', () => {
		expect(getFitnessActions({ date, done: false, workoutTitle: 'Day 20' })).toHaveLength(1);
		expect(getFitnessActions({ date, done: false, workoutTitle: 'Rest day' })).toEqual([]);
		expect(getMeditationActions(date, true)).toEqual([]);
		expect(getBreathingActions(date, false)).toHaveLength(1);
		expect(getHappinessActions(date, false)).toHaveLength(1);
	});

	it('keeps a fasting nutrition day available for review', () => {
		expect(getNutritionActions(nutritionState(false))).toEqual([]);
		expect(getNutritionActions(nutritionState(true))).toEqual([
			expect.objectContaining({
				id: `nutrition:fasting:${date}`,
				title: 'Full-day fast marked',
				action: { type: 'navigate', href: `/nutrition/log/${date}` }
			})
		]);
	});

	it('shows bedtime setup, pending, pass, and fail actions', () => {
		expect(getSleepActions(sleepState({ setupRequired: true }))[0]?.id).toBe('sleep:select-apps');
		expect(getSleepActions(sleepState())[0]?.id).toBe(`sleep:bedtime:${date}`);
		expect(getSleepActions(sleepState({ status: 'pass' }))).toEqual([]);
		expect(getSleepActions(sleepState({ status: 'fail', lateUsageSeconds: 301 }))[0]?.id).toBe(
			`sleep:late-usage:${date}`
		);
	});

	it('warns when one hour of screen time remains', () => {
		const [action] = getScreenTimeActions(screenTimeState({ minutes: 180 }));
		expect(action?.id).toBe(`screen-time:remaining:${date}`);
		expect(action?.title).toContain('1h');
	});

	it('uses a new action when the screen-time limit is exceeded', () => {
		const [action] = getScreenTimeActions(screenTimeState({ minutes: 265 }));
		expect(action?.id).toBe(`screen-time:over-limit:${date}`);
		expect(action?.title).toContain('25m');
	});

	it('does not warn while more than one hour remains', () => {
		expect(getScreenTimeActions(screenTimeState({ minutes: 179 }))).toEqual([]);
	});
});

describe('action feed ordering', () => {
	it('places blockers and warnings before activities', () => {
		const items = [item('activity'), item('blocking'), item('warning')];
		expect(sortActionFeed(items).map(({ priority }) => priority)).toEqual([
			'blocking',
			'warning',
			'activity'
		]);
	});
});

function nutritionState(fasting: boolean) {
	return {
		date,
		today: date,
		fasting,
		eatingWindow: null,
		now: new Date('2026-08-20T12:00:00Z'),
		timeZone: 'UTC'
	};
}

function sleepState(overrides: Partial<Parameters<typeof getSleepActions>[0]> = {}) {
	return {
		date,
		status: 'pending' as const,
		bedtime: '22:30',
		lateUsageSeconds: 0,
		setupRequired: false,
		...overrides
	};
}

function screenTimeState(overrides: Partial<Parameters<typeof getScreenTimeActions>[0]> = {}) {
	return {
		date,
		minutes: 0,
		limitMinutes: 240,
		recorded: true,
		hasMeasurements: true,
		...overrides
	};
}

function item(priority: ActionFeedItem['priority']): ActionFeedItem {
	return {
		id: priority,
		trackerIds: ['fitness'],
		priority,
		icon: 'tracker',
		title: priority,
		action: { type: 'navigate', href: '/fitness' }
	};
}
