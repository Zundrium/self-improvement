import { describe, expect, it } from 'vitest';
import { appTrackers, trackers } from './registry';

describe('tracker registry', () => {
	it('registers achievements and streaks without app icons', () => {
		const hiddenTrackerIds = trackers
			.filter((tracker) => !tracker.hasAppIcon)
			.map((tracker) => tracker.id);
		expect(hiddenTrackerIds).toEqual(['achievements', 'streaks']);
		expect(appTrackers.map((tracker) => tracker.id)).not.toContain('achievements');
	});
});
