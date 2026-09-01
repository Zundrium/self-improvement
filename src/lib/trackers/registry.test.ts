import { describe, expect, it } from 'vitest';
import {
	appTrackers,
	getTrackerColors,
	getTrackerForPathname,
	trackerGradient
} from './registry';

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

	it('uses three-color tracker gradients', () => {
		expect(getTrackerColors('stretch')).toEqual({
			primary: '#FEAC5E',
			secondary: '#C779D0',
			tertiary: '#4BC0C8'
		});
		expect(getTrackerColors('chores')).toEqual({
			primary: '#6455AF',
			secondary: '#8E4848',
			tertiary: '#884482'
		});
		expect(getTrackerColors('happiness')).toEqual({
			primary: '#FFF700',
			secondary: '#C78800',
			tertiary: '#FF0000'
		});
		expect(trackerGradient(getTrackerColors('steps'))).toBe(
			'linear-gradient(135deg, #00F094 0%, #1BBDDA 52%, #4568BA 100%)'
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
