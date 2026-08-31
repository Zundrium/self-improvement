import { describe, expect, it } from 'vitest';
import { createEmptyStatus, failedTrackerIds } from './status';

describe('sync status', () => {
	it('omits failures for disabled native trackers without changing stored status', () => {
		const status = createEmptyStatus();
		status.trackers.steps.outcome = 'failed';
		status.trackers.sleep.outcome = 'failed';

		expect(failedTrackerIds(status, ['sleep'])).toEqual(['sleep']);
		expect(status.trackers.steps.outcome).toBe('failed');
	});
});
