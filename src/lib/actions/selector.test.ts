import { describe, expect, it, vi } from 'vitest';
import type {
	ActionCandidate,
	ActionEnvironment,
	ActionResolution,
	ActionSnapshot
} from './contracts';
import { selectActionFeedItems } from './selector';

const environment: ActionEnvironment = {
	now: new Date('2026-04-10T12:00:00.000Z'),
	timeZone: 'UTC',
	localDate: '2026-04-10',
	localMinuteOfDay: 12 * 60
};

describe('action candidate selection', () => {
	it('does not resolve candidates when any required tracker is disabled', () => {
		const resolve = vi.fn(() => resolution('disabled'));
		const disabledCandidate: ActionCandidate = {
			id: 'cross-tracker.disabled',
			trackerIds: ['steps', 'sleep'],
			resolve
		};

		expect(selectActionFeedItems([disabledCandidate], snapshot(['steps']), environment)).toEqual(
			[]
		);
		expect(resolve).not.toHaveBeenCalled();
	});

	it('orders by priority before ordering equal priorities by descending score', () => {
		const candidates = [
			candidate('warning-low', { priority: 'warning', score: 20 }),
			candidate('warning-high', { priority: 'warning', score: 90 }),
			candidate('blocking', { priority: 'blocking', score: 1 })
		];

		expect(selectedIds(candidates)).toEqual([
			'action:blocking',
			'action:warning-high',
			'action:warning-low'
		]);
	});

	it('keeps only the highest-ranked proposal for a goal', () => {
		const candidates = [
			candidate('long-workout', { goalId: 'daily-workout', score: 60 }),
			candidate('quick-workout', { goalId: 'daily-workout', score: 90 }),
			candidate('meditation', { score: 50 })
		];
		const result = selectActionFeedItems(candidates, snapshot(), environment);

		expect(result.map(({ id }) => id)).toEqual(['action:quick-workout', 'action:meditation']);
		expect(result[0]).not.toHaveProperty('goalId');
		expect(result[0]).not.toHaveProperty('score');
	});

	it('skips lower-ranked proposals that conflict with a selected proposal', () => {
		const candidates = [
			candidate('workout', { conflictKeys: ['physical-effort-now'], score: 90 }),
			candidate('walk', { conflictKeys: ['physical-effort-now'], score: 80 }),
			candidate('journal', { score: 70 })
		];

		expect(selectedIds(candidates)).toEqual(['action:workout', 'action:journal']);
	});

	it('uses candidate IDs to break equal priority and score ties', () => {
		const candidates = [candidate('z-candidate'), candidate('a-candidate')];

		expect(selectedIds(candidates)).toEqual(['action:a-candidate', 'action:z-candidate']);
	});

	it('returns every proposal with a score above zero', () => {
		const candidates = [
			candidate('fourth', { score: 40 }),
			candidate('zero', { score: 0 }),
			candidate('second', { score: 80 }),
			candidate('negative', { score: -1 }),
			candidate('first', { score: 100 }),
			candidate('third', { score: 60 })
		];

		expect(selectedIds(candidates)).toEqual([
			'action:first',
			'action:second',
			'action:third',
			'action:fourth'
		]);
	});
});

function candidate(id: string, overrides: Partial<ActionResolution> = {}): ActionCandidate {
	return {
		id,
		trackerIds: ['steps'],
		resolve: () => ({ ...resolution(id), ...overrides })
	};
}

function resolution(id: string): ActionResolution {
	return {
		id: `action:${id}`,
		priority: 'activity',
		score: 50,
		icon: 'tracker',
		title: id,
		reason: id,
		action: { type: 'navigate', href: `/${id}` }
	};
}

function selectedIds(candidates: ActionCandidate[]) {
	return selectActionFeedItems(candidates, snapshot(), environment).map(({ id }) => id);
}

function snapshot(
	enabledTrackerIds: ActionSnapshot['enabledTrackerIds'] = ['steps']
): ActionSnapshot {
	return {
		date: '2026-04-10',
		today: '2026-04-10',
		enabledTrackerIds,
		trackers: {
			steps: { date: '2026-04-10', steps: 4_000, goal: 5_000, hasMeasurements: true },
			sleep: {
				date: '2026-04-10',
				status: 'pending',
				bedtime: '22:30',
				lateUsageSeconds: 0,
				setupRequired: false
			},
			'screen-time': {
				date: '2026-04-10',
				minutes: 30,
				limitMinutes: 120,
				recorded: true,
				hasMeasurements: true
			},
			fitness: {
				date: '2026-04-10',
				scheduled: true,
				completed: false,
				workoutId: 10,
				sets: 6,
				firstSetDurationSeconds: 130,
				additionalSetDurationSeconds: 240
			},
			nutrition: {
				date: '2026-04-10',
				configured: true,
				hasEntries: true,
				calories: 1_200,
				calorieGoal: 2_000,
				fasting: false,
				eatingWindow: null
			},
			meditation: { date: '2026-04-10', completed: false, daysSinceLastSession: 2 },
			breathing: { date: '2026-04-10', completed: false },
			happiness: { date: '2026-04-10', rating: null },
			period: { date: '2026-04-10', flow: null }
		}
	};
}
