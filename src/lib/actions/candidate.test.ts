import { describe, expect, it, vi } from 'vitest';
import { buildActionSnapshot } from '$lib/local/action-snapshot';
import { createDefaultAppState } from '$lib/local/state';
import { defineActionCandidate } from './candidate';
import type { ActionEnvironment } from './contracts';
import { selectActionFeedItems } from './selector';

const environment: ActionEnvironment = {
	now: new Date('2026-04-10T12:00:00.000Z'),
	timeZone: 'UTC',
	localDate: '2026-04-10',
	localMinuteOfDay: 12 * 60
};

describe('action candidate definitions', () => {
	it('standardizes tracker requirements, tracker icons, and instance ids', () => {
		const candidate = defineActionCandidate({
			id: 'sleep.setup',
			trackerIds: ['sleep'],
			requires: ['screen-time', 'sleep'],
			resolve: () => ({
				instanceId: '2026-04-10',
				priority: 'warning',
				score: 10,
				title: 'Set up sleep',
				reason: 'Choose apps',
				action: { type: 'navigate', href: '/sleep' }
			})
		});

		expect(candidate.requiredTrackerIds).toEqual(['sleep', 'screen-time']);
		expect(candidate.resolve(snapshot(), environment)).toMatchObject({
			id: 'sleep.setup:2026-04-10',
			icon: 'tracker'
		});
	});

	it('requires every condition before resolving a candidate', () => {
		const firstCondition = vi.fn(() => true);
		const blockedCondition = vi.fn(() => false);
		const resolve = vi.fn(() => ({
			priority: 'activity' as const,
			score: 10,
			title: 'Walk',
			reason: 'Move',
			action: { type: 'navigate' as const, href: '/steps' }
		}));
		const candidate = defineActionCandidate({
			id: 'steps.walk',
			trackerIds: ['steps'],
			conditions: [firstCondition, blockedCondition],
			resolve
		});

		expect(selectActionFeedItems([candidate], snapshot(), environment)).toEqual([]);
		expect(firstCondition).toHaveBeenCalledOnce();
		expect(blockedCondition).toHaveBeenCalledOnce();
		expect(resolve).not.toHaveBeenCalled();
	});
});

function snapshot() {
	const state = createDefaultAppState(environment.now);
	state.enabledTrackerIds = ['steps', 'sleep', 'screen-time'];
	return buildActionSnapshot(state, environment.localDate, environment.localDate);
}
