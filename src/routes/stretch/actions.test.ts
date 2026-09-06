import { describe, expect, it } from 'vitest';
import type { ActionEnvironment, ActionSnapshot } from '$lib/actions/contracts';
import { createDefaultAppState } from '$lib/local/state';
import { buildActionSnapshot } from '$lib/local/action-snapshot';
import { selectActionFeedItems } from '$lib/actions/selector';
import { stretchActionCandidates } from './actions';

describe('stretch action candidates', () => {
	const environment: ActionEnvironment = {
		now: new Date('2026-04-10T10:00:00.000Z'),
		timeZone: 'UTC',
		localDate: '2026-04-10',
		localMinuteOfDay: 600
	};

	it('suggests an incomplete daily routine', () => {
		const result = resolve(buildSnapshot());

		expect(result).toMatchObject({
			id: 'stretch.daily-routine:2026-04-10',
			title: "Let's stretch now",
			action: { href: '/stretch' }
		});
	});

	it('resolves completed routines as complete', () => {
		const snapshot = buildSnapshot();
		snapshot.trackers.stretch.completed = true;

		expect(status(snapshot)).toMatchObject({ status: 'complete', fallback: true, score: 1 });
	});

	it('resolves unscheduled days as rest rather than complete', () => {
		const snapshot = buildSnapshot();
		snapshot.trackers.stretch.scheduled = false;
		snapshot.trackers.stretch.completed = true;

		expect(status(snapshot)).toMatchObject({ status: 'rest', title: 'Rest day' });
	});

	function buildSnapshot() {
		const state = createDefaultAppState(new Date('2026-04-01T10:00:00.000Z'));
		return buildActionSnapshot(state, environment.localDate, environment.localDate);
	}

	function resolve(snapshot: ActionSnapshot) {
		return selectActionFeedItems(stretchActionCandidates, snapshot, environment)[0] ?? null;
	}

	function status(snapshot: ActionSnapshot) {
		const candidate = stretchActionCandidates.find(({ id }) => id === 'stretch.status');
		if (!candidate) throw new Error('Stretch status candidate is missing');
		return candidate.resolve(snapshot, environment);
	}
});
