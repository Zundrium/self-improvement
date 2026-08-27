import { describe, expect, it } from 'vitest';
import type { ActionEnvironment, ActionSnapshot } from '$lib/actions/contracts';
import { selectActionFeedItems } from '$lib/actions/selector';
import { fitnessActionCandidates } from './actions';
import { defaultWorkoutSets } from './fitness';

describe('fitness action candidates', () => {
	it('starts workouts at no more than two sets', () => {
		expect(defaultWorkoutSets(7)).toBe(2);
		expect(defaultWorkoutSets(1)).toBe(1);
	});

	it.each([
		[5 * 60 - 1, 'fitness.scheduled-workout:2026-04-10'],
		[5 * 60, 'fitness.morning-workout:2026-04-10'],
		[12 * 60 - 1, 'fitness.morning-workout:2026-04-10'],
		[12 * 60, 'fitness.scheduled-workout:2026-04-10'],
		[20 * 60 - 1, 'fitness.scheduled-workout:2026-04-10'],
		[20 * 60, 'fitness.quick-evening-workout:2026-04-10']
	])('selects the useful variant at minute %i', (minute, expectedId) => {
		const [item] = selectActionFeedItems(fitnessActionCandidates, snapshot(), environment(minute));
		expect(item?.id).toBe(expectedId);
	});

	it('uses a two-set default and one set for the late-evening variant', () => {
		const [standard] = selectActionFeedItems(
			fitnessActionCandidates,
			snapshot(),
			environment(12 * 60)
		);
		const [quick] = selectActionFeedItems(
			fitnessActionCandidates,
			snapshot(),
			environment(20 * 60)
		);
		expect(standard).toMatchObject({
			reason: '7 minutes to feel stronger',
			action: { href: '/fitness?date=2026-04-10&sets=2' }
		});
		expect(quick).toMatchObject({
			reason: '3 minutes to feel stronger',
			action: { href: '/fitness?date=2026-04-10&sets=1' }
		});
	});

	it('returns no action for another date, completed workouts, or missing workout facts', () => {
		const otherDate = snapshot();
		otherDate.date = '2026-04-09';
		otherDate.trackers.fitness.date = '2026-04-09';
		const completed = snapshot();
		completed.trackers.fitness.completed = true;
		const missingSets = snapshot();
		missingSets.trackers.fitness.sets = null;
		for (const state of [otherDate, completed, missingSets]) {
			expect(selectActionFeedItems(fitnessActionCandidates, state, environment(10 * 60))).toEqual(
				[]
			);
		}
	});
});

function environment(localMinuteOfDay: number): ActionEnvironment {
	return {
		now: new Date('2026-04-10T10:00:00.000Z'),
		timeZone: 'UTC',
		localDate: '2026-04-10',
		localMinuteOfDay
	};
}

function snapshot(): ActionSnapshot {
	return {
		date: '2026-04-10',
		today: '2026-04-10',
		enabledTrackerIds: ['fitness'],
		trackers: {
			steps: { date: '2026-04-10', steps: 0, goal: 5_000, hasMeasurements: false },
			sleep: {
				date: '2026-04-10',
				status: 'pending',
				bedtime: '22:30',
				lateUsageSeconds: 0,
				setupRequired: false
			},
			'screen-time': {
				date: '2026-04-10',
				minutes: 0,
				limitMinutes: 240,
				recorded: false,
				hasMeasurements: false
			},
			fitness: {
				date: '2026-04-10',
				scheduled: true,
				completed: false,
				workoutId: 10,
				sets: 5,
				firstSetDurationSeconds: 130,
				additionalSetDurationSeconds: 240
			},
			nutrition: {
				date: '2026-04-10',
				configured: false,
				hasEntries: false,
				calories: 0,
				calorieGoal: null,
				fasting: false,
				eatingWindow: null
			},
			meditation: { date: '2026-04-10', completed: false, daysSinceLastSession: null },
			breathing: { date: '2026-04-10', completed: false },
			happiness: { date: '2026-04-10', rating: null },
			period: { date: '2026-04-10', flow: null }
		}
	};
}
