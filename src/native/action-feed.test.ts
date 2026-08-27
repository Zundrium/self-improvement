import { describe, expect, it } from 'vitest';
import { createEmptyStatus } from '$domain/status';
import { buildNativeActionFeedItems } from './action-feed';

describe('native action feed', () => {
	it('shows a permission blocker instead of a duplicate sync action', () => {
		const status = createEmptyStatus();
		status.trackers.sleep = {
			permission: 'denied',
			outcome: 'failed',
			failure: { category: 'permission', message: 'Denied', retryable: true }
		};
		const actions = buildNativeActionFeedItems({
			enabledTrackerIds: ['sleep'],
			healthAvailable: true,
			permissions: { steps: 'granted', sleep: 'denied', screenTime: 'granted' },
			status
		});
		expect(actions.map(({ id }) => id)).toEqual(['permission:usage-access']);
	});

	it('uses one Usage Access blocker for sleep and screen time', () => {
		const actions = buildNativeActionFeedItems({
			enabledTrackerIds: ['sleep', 'screen-time'],
			healthAvailable: true,
			permissions: { steps: 'granted', sleep: 'denied', screenTime: 'denied' },
			status: createEmptyStatus()
		});
		expect(actions).toEqual([
			expect.objectContaining({
				id: 'permission:usage-access',
				trackerIds: ['sleep', 'screen-time']
			})
		]);
	});

	it('groups failed granted trackers into one retry action', () => {
		const status = createEmptyStatus();
		status.trackers.steps = { permission: 'granted', outcome: 'failed' };
		status.trackers.sleep = { permission: 'granted', outcome: 'failed' };
		const actions = buildNativeActionFeedItems({
			enabledTrackerIds: ['steps', 'sleep', 'meditation'],
			healthAvailable: true,
			permissions: { steps: 'granted', sleep: 'granted', screenTime: 'granted' },
			status
		});
		expect(actions).toHaveLength(1);
		expect(actions[0]?.trackerIds).toEqual(['steps', 'sleep']);
		expect(actions[0]?.action.type).toBe('sync-android-data');
	});
});
