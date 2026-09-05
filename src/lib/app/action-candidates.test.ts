import { describe, expect, it } from 'vitest';
import { appTrackers } from '$lib/trackers/registry';
import { appActionCandidates, trackerActionCandidates } from './action-candidates';

describe('tracker action candidate registry', () => {
	it('registers every app tracker explicitly', () => {
		expect(Object.keys(trackerActionCandidates).toSorted()).toEqual(
			appTrackers.map(({ id }) => id).toSorted()
		);
	});

	it('owns every candidate under a registered tracker with a unique id', () => {
		for (const [trackerId, candidates] of Object.entries(trackerActionCandidates)) {
			for (const candidate of candidates) expect(candidate.trackerIds).toContain(trackerId);
		}
		const ids = appActionCandidates.map(({ id }) => id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
