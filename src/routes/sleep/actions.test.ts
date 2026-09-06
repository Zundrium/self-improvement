import { describe, expect, it } from 'vitest';
import type { ActionEnvironment } from '$lib/actions/contracts';
import { selectActionFeedItems } from '$lib/actions/selector';
import { buildActionSnapshot } from '$lib/local/action-snapshot';
import { createDefaultAppState } from '$lib/local/state';
import { sleepActionCandidates } from './actions';

const environment: ActionEnvironment = {
	now: new Date('2026-04-10T12:00:00.000Z'),
	timeZone: 'UTC',
	localDate: '2026-04-10',
	localMinuteOfDay: 12 * 60
};

describe('sleep action candidates', () => {
	it('keeps setup available when the separate Screen time tracker is hidden', () => {
		const state = createDefaultAppState(environment.now);
		state.enabledTrackerIds = ['sleep'];
		const snapshot = buildActionSnapshot(state, environment.localDate, environment.localDate);

		expect(selectActionFeedItems(sleepActionCandidates, snapshot, environment)[0]).toMatchObject({
			id: 'sleep.setup',
			trackerIds: ['sleep'],
			action: { href: '/screen-time' }
		});
	});

	it.each([
		['pass', 'complete'],
		['pending', 'tracking'],
		['fail', 'attention']
	] as const)('maps %s sleep to %s status', (sleepStatus, status) => {
		const state = createDefaultAppState(environment.now);
		const snapshot = buildActionSnapshot(state, environment.localDate, environment.localDate);
		snapshot.trackers.sleep.status = sleepStatus;
		const candidate = sleepActionCandidates.find(({ id }) => id === 'sleep.status');
		if (!candidate) throw new Error('Sleep status candidate is missing');

		expect(candidate.resolve(snapshot, environment)).toMatchObject({
			status,
			fallback: true,
			score: 1
		});
	});
});
