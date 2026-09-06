import { describe, expect, it } from 'vitest';
import type { ActionEnvironment, ActionSnapshot } from '$lib/actions/contracts';
import { buildActionSnapshot } from '$lib/local/action-snapshot';
import { createDefaultAppState } from '$lib/local/state';
import { stepActionCandidates } from './actions';

const environment: ActionEnvironment = {
	now: new Date('2026-04-10T12:00:00.000Z'),
	timeZone: 'UTC',
	localDate: '2026-04-10',
	localMinuteOfDay: 12 * 60
};

describe('steps status candidate', () => {
	it('keeps missing measurements actionable', () => {
		expect(status(snapshot())).toMatchObject({
			status: 'actionable',
			title: 'No step data yet',
			fallback: true,
			score: 1
		});
	});

	it('reports remaining steps and completed goals', () => {
		const remaining = snapshot();
		remaining.trackers.steps.hasMeasurements = true;
		remaining.trackers.steps.steps = 4_000;
		const exceeded = snapshot();
		exceeded.trackers.steps.hasMeasurements = true;
		exceeded.trackers.steps.steps = 6_000;

		expect(status(remaining)).toMatchObject({
			status: 'actionable',
			title: '1,000 steps left'
		});
		expect(status(exceeded)).toMatchObject({
			status: 'complete',
			title: '1,000 steps over your goal'
		});
	});
});

function status(snapshot: ActionSnapshot) {
	const candidate = stepActionCandidates.find(({ id }) => id === 'steps.status');
	if (!candidate) throw new Error('Steps status candidate is missing');
	return candidate.resolve(snapshot, environment);
}

function snapshot() {
	const state = createDefaultAppState(environment.now);
	return buildActionSnapshot(state, environment.localDate, environment.localDate);
}
