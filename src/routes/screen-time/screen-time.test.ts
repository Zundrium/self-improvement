import { describe, expect, it } from 'vitest';
import { hasTrackedApps } from './screen-time';

describe('hasTrackedApps', () => {
	it('requires at least one selected app', () => {
		expect(hasTrackedApps([])).toBe(false);
		expect(hasTrackedApps([{ tracked: false }, { tracked: false }])).toBe(false);
		expect(hasTrackedApps([{ tracked: false }, { tracked: true }])).toBe(true);
	});
});
