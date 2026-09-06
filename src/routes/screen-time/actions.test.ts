import { describe, expect, it } from 'vitest';
import type { ActionEnvironment, ActionSnapshot } from '$lib/actions/contracts';
import { buildActionSnapshot } from '$lib/local/action-snapshot';
import { createDefaultAppState } from '$lib/local/state';
import { screenTimeActionCandidates } from './actions';

const environment: ActionEnvironment = {
	now: new Date('2026-04-10T12:00:00.000Z'),
	timeZone: 'UTC',
	localDate: '2026-04-10',
	localMinuteOfDay: 12 * 60
};

describe('screen-time status candidate', () => {
	it('keeps missing measurements actionable', () => {
		expect(status(snapshot())).toMatchObject({
			status: 'actionable',
			title: 'No screen-time data yet',
			fallback: true,
			score: 1
		});
	});

	it('tracks today below the limit, completes historical data, and flags an excess', () => {
		const today = measuredSnapshot(180);
		const historical = measuredSnapshot(180);
		historical.trackers['screen-time'].date = '2026-04-09';
		const exceeded = measuredSnapshot(241);

		expect(status(today)).toMatchObject({ status: 'tracking' });
		expect(status(historical)).toMatchObject({ status: 'complete' });
		expect(status(exceeded)).toMatchObject({ status: 'attention' });
	});
});

function status(snapshot: ActionSnapshot) {
	const candidate = screenTimeActionCandidates.find(({ id }) => id === 'screen-time.status');
	if (!candidate) throw new Error('Screen-time status candidate is missing');
	return candidate.resolve(snapshot, environment);
}

function measuredSnapshot(minutes: number) {
	const result = snapshot();
	result.trackers['screen-time'].hasMeasurements = true;
	result.trackers['screen-time'].recorded = true;
	result.trackers['screen-time'].minutes = minutes;
	result.trackers['screen-time'].limitMinutes = 240;
	return result;
}

function snapshot() {
	const state = createDefaultAppState(environment.now);
	return buildActionSnapshot(state, environment.localDate, environment.localDate);
}
