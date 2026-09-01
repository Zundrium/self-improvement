import { describe, expect, it } from 'vitest';
import { appTrackers, getTrackerColors, getTrackerForPathname } from './registry';

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

	it('registers Stretch as an enabled app tracker', () => {
		expect(appTrackers).toContainEqual(
			expect.objectContaining({
				id: 'stretch',
				label: 'Stretch',
				href: '/stretch',
				settingsHref: '/stretch/settings',
				defaultEnabled: true
			})
		);
	});

	it('uses readable tracker colors', () => {
		expect(getTrackerColors('stretch')).toEqual({ primary: '#c2410c', secondary: '#9a3412' });
		expect(getTrackerColors('chores')).toEqual({ primary: '#a21caf', secondary: '#be185d' });
		expect(getTrackerColors('happiness')).toEqual({ primary: '#a16207', secondary: '#ca8a04' });
	});

	it('registers Chores as a fixed daily tracker without settings', () => {
		expect(appTrackers).toContainEqual(
			expect.objectContaining({
				id: 'chores',
				label: 'Chores',
				href: '/chores',
				settingsHref: null,
				defaultEnabled: true
			})
		);
	});

	it('uses matching settings routes when trackers expose settings', () => {
		for (const tracker of appTrackers) {
			if (tracker.settingsHref) expect(tracker.settingsHref).toBe(`/${tracker.id}/settings`);
		}
	});
});
