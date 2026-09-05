import { describe, expect, it } from 'vitest';
import { appTrackers, getTrackerColors, getTrackerForPathname, trackerGradient } from './registry';

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

	it('uses global CSS variables for three-color tracker gradients', () => {
		expect(getTrackerColors('nutrition')).toEqual({
			primary: 'var(--tracker-nutrition-primary)',
			secondary: 'var(--tracker-nutrition-secondary)',
			tertiary: 'var(--tracker-nutrition-tertiary)'
		});
		expect(trackerGradient(getTrackerColors('steps'))).toBe(
			'linear-gradient(135deg, var(--tracker-steps-primary) 0%, var(--tracker-steps-secondary) 52%, var(--tracker-steps-tertiary) 100%)'
		);
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
