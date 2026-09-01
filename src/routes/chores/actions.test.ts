import { describe, expect, it } from 'vitest';
import type { ActionEnvironment, ActionSnapshot } from '$lib/actions/contracts';
import { choresActionCandidates } from './actions';

const environment: ActionEnvironment = {
	now: new Date('2026-04-10T12:00:00.000Z'),
	timeZone: 'UTC',
	localDate: '2026-04-10',
	localMinuteOfDay: 12 * 60
};

describe('chores actions', () => {
	it('suggests the daily timer until it is completed', () => {
		const candidate = choresActionCandidates[0];
		const incomplete = candidate.resolve(snapshot(false), environment);
		const complete = candidate.resolve(snapshot(true), environment);

		expect(incomplete).toMatchObject({
			id: 'chores.daily-reset:2026-04-10',
			title: 'Take 10 minutes to reset',
			action: { type: 'navigate', href: '/chores' }
		});
		expect(complete).toBeNull();
	});
});

function snapshot(completed: boolean): ActionSnapshot {
	return {
		date: '2026-04-10',
		today: '2026-04-10',
		enabledTrackerIds: ['chores'],
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
				configured: false,
				hasEntries: false,
				calories: 0,
				calorieGoal: null,
				fasting: false,
				eatingWindow: null
			},
			meditation: { date: '2026-04-10', completed: false, daysSinceLastSession: null },
			breathing: { date: '2026-04-10', completed: false },
			stretch: { date: '2026-04-10', scheduled: false, completed: false },
			chores: { date: '2026-04-10', completed },
			happiness: { date: '2026-04-10', rating: null },
			period: { date: '2026-04-10', flow: null }
		}
	};
}
