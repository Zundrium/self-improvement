import { describe, expect, it } from 'vitest';
import { appTrackers, getTrackerForPathname } from './registry';

describe('tracker registry', () => {
	it('resolves streak and achievement pages as trackers', () => {
		expect(getTrackerForPathname('/streaks')?.id).toBe('streaks');
		expect(getTrackerForPathname('/achievements')?.id).toBe('achievements');
	});

	it('keeps trackers without app icons out of the launcher', () => {
		const appTrackerIds = appTrackers.map((tracker) => tracker.id);
		expect(appTrackerIds).not.toContain('streaks');
		expect(appTrackerIds).not.toContain('achievements');
	});

	it('registers settings only for configurable trackers', () => {
		expect(getTrackerForPathname('/sleep')?.settingsHref).toBe('/sleep/settings');
		expect(getTrackerForPathname('/steps')?.settingsHref).toBeNull();
	});
});
