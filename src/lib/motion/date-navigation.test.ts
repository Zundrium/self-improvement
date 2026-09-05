import { describe, expect, it } from 'vitest';
import { trackers } from '$lib/trackers/registry';
import { dateDistance, dateNavigationKey } from './date-navigation';

describe('date navigation identity', () => {
	it.each(trackers)('keeps $id mounted across date queries', ({ href }) => {
		expect(dateNavigationKey(href, '2026-09-04')).toBe(dateNavigationKey(href, '2026-09-05'));
	});

	it('keeps nutrition logs mounted across route parameters', () => {
		expect(dateNavigationKey('/nutrition/log/2026-09-04', null)).toBe(
			dateNavigationKey('/nutrition/log/today', null)
		);
	});

	it('retains independent lifetimes for nested workflows and entry editors', () => {
		expect(dateNavigationKey('/nutrition/track', '2026-09-04')).not.toBe(
			dateNavigationKey('/nutrition/track', '2026-09-05')
		);
		expect(dateNavigationKey('/nutrition/entry/one', null)).not.toBe(
			dateNavigationKey('/nutrition/entry/two', null)
		);
		expect(dateNavigationKey('/steps', null)).not.toBe(dateNavigationKey('/steps/settings', null));
	});

	it('uses calendar days across daylight-saving and month boundaries', () => {
		expect(dateDistance('2026-03-28', '2026-03-29')).toBe(1);
		expect(dateDistance('2026-03-01', '2026-02-28')).toBe(-1);
	});
});
