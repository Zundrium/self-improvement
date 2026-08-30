import { describe, expect, it } from 'vitest';
import type { ActionEnvironment, ActionSnapshot } from '$lib/actions/contracts';
import { selectActionFeedItems } from '$lib/actions/selector';
import { nutritionActionCandidates } from './actions';

describe('nutrition action candidates', () => {
	it('offers meal logging while the eating window is open', () => {
		const [item] = selectActionFeedItems(
			nutritionActionCandidates,
			snapshot(),
			environment(12 * 60)
		);

		expect(item).toMatchObject({
			id: 'nutrition.eating-window-open:2026-04-10',
			title: 'Add a meal',
			reason: 'Your eating window is open',
			action: { href: '/nutrition/track?date=2026-04-10' }
		});
	});

	it('opens at the configured start and closes at the configured end', () => {
		expect(selectedIds(11 * 60 + 59)).not.toContain('nutrition.eating-window-open:2026-04-10');
		expect(selectedIds(12 * 60)).toContain('nutrition.eating-window-open:2026-04-10');
		expect(selectedIds(19 * 60 + 59)).toContain('nutrition.eating-window-open:2026-04-10');
		expect(selectedIds(20 * 60)).not.toContain('nutrition.eating-window-open:2026-04-10');
	});

	it('does not offer meal logging for another date or a full-day fast', () => {
		const historical = snapshot();
		historical.date = '2026-04-09';
		historical.trackers.nutrition.date = '2026-04-09';
		const fasting = snapshot();
		fasting.trackers.nutrition.fasting = true;

		for (const state of [historical, fasting]) {
			const hasEatingWindowAction = selectActionFeedItems(
				nutritionActionCandidates,
				state,
				environment(12 * 60)
			).some(({ id }) => id.startsWith('nutrition.eating-window-open:'));
			expect(hasEatingWindowAction).toBe(false);
		}
	});
});

function selectedIds(localMinuteOfDay: number) {
	return selectActionFeedItems(
		nutritionActionCandidates,
		snapshot(),
		environment(localMinuteOfDay)
	).map(({ id }) => id);
}

function environment(localMinuteOfDay: number): ActionEnvironment {
	return {
		now: new Date('2026-04-10T12:00:00.000Z'),
		timeZone: 'UTC',
		localDate: '2026-04-10',
		localMinuteOfDay
	};
}

function snapshot(): ActionSnapshot {
	return {
		date: '2026-04-10',
		today: '2026-04-10',
		enabledTrackerIds: ['nutrition'],
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
				scheduled: false,
				completed: false,
				workoutId: null,
				sets: null,
				firstSetDurationSeconds: null,
				additionalSetDurationSeconds: null
			},
			nutrition: {
				date: '2026-04-10',
				configured: true,
				hasEntries: false,
				calories: 0,
				calorieGoal: 2_000,
				fasting: false,
				eatingWindow: { start: '12:00', end: '20:00' }
			},
			meditation: { date: '2026-04-10', completed: false, daysSinceLastSession: null },
			breathing: { date: '2026-04-10', completed: false },
			stretch: { date: '2026-04-10', scheduled: false, completed: false },
			happiness: { date: '2026-04-10', rating: null },
			period: { date: '2026-04-10', flow: null }
		}
	};
}
