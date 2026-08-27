import { describe, expect, it } from 'vitest';
import { newlyCompletedTrackerIds } from './completion-events';
import { createDefaultAppState } from './state';

const now = new Date('2026-03-20T12:00:00.000Z');

describe('newlyCompletedTrackerIds', () => {
	it('identifies completion for every tracker', () => {
		const before = createDefaultAppState(now);
		const after = createDefaultAppState(now);
		before.gamification.startedLocalDate = '2026-03-19';
		after.gamification.startedLocalDate = '2026-03-19';
		completeEveryTracker(after);

		expect(newlyCompletedTrackerIds(before, after, now)).toEqual([
			'steps',
			'sleep',
			'screen-time',
			'fitness',
			'nutrition',
			'meditation',
			'breathing',
			'stretch',
			'happiness',
			'period'
		]);
		expect(newlyCompletedTrackerIds(after, after, now)).toEqual([]);
	});
});

function completeEveryTracker(state: ReturnType<typeof createDefaultAppState>) {
	const timestamp = now.toISOString();
	state.steps.days.push({
		date: '2026-03-20',
		count: state.steps.dailyGoal,
		sourceEndAt: timestamp
	});
	state.sleep.days.push({
		localDate: '2026-03-20',
		configuredBedtime: '22:30',
		windowStartAt: null,
		windowEndAt: null,
		lateUsageSeconds: 0,
		latestScreenActivityAt: null,
		usedApps: [],
		violatingApps: [],
		status: 'pass',
		sourceTimestamp: timestamp
	});
	state.screenTime.days.push({
		date: '2026-03-19',
		totalMinutes: 0,
		apps: [],
		sourceTimestamp: timestamp
	});
	state.fitness.completedDays.push({ workoutId: 1, dateKey: '2026-03-20' });
	state.nutrition.fastingDates.push('2026-03-20');
	state.meditation.sessions.push({
		id: 'meditation',
		localDate: '2026-03-20',
		durationSeconds: 60,
		startedAt: now.getTime()
	});
	state.breathing.exercises.push({
		localDate: '2026-03-20',
		technique: '4-7-8',
		durationSeconds: 60,
		startedAt: now.getTime()
	});
	state.stretch.sessions.push({
		id: 'stretch',
		localDate: '2026-03-20',
		holdSeconds: 30,
		completedAt: timestamp
	});
	state.happiness.entries.push({
		localDate: '2026-03-20',
		rating: 4,
		reasons: ['gratitude'],
		updatedAt: timestamp
	});
	state.period.entries.push({
		localDate: '2026-03-20',
		flow: 'medium',
		notes: '',
		updatedAt: timestamp
	});
}
