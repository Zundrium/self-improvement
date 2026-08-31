import { describe, expect, it } from 'vitest';
import type { ActionFeedItem } from '$lib/api-types';
import { mergeActionFeedItems, millisecondsUntilNextMinute } from './action-feed';

describe('action feed refresh timing', () => {
	it('waits until the exact next minute boundary', () => {
		expect(millisecondsUntilNextMinute(new Date(2026, 3, 10, 12, 0, 0, 0))).toBe(60_000);
		expect(millisecondsUntilNextMinute(new Date(2026, 3, 10, 12, 34, 59, 250))).toBe(750);
	});
});

describe('action feed merging', () => {
	it('suppresses lower tracker actions while native access is blocked', () => {
		const localItems = [item('sleep-data', ['sleep'], 'warning'), item('meditate', ['meditation'])];
		const nativeItems = [item('health-access', ['steps', 'sleep'], 'blocking')];
		const result = mergeActionFeedItems(localItems, nativeItems);
		expect(result.map(({ id }) => id)).toEqual(['health-access', 'meditate']);
	});

	it('orders native and local items by priority', () => {
		const result = mergeActionFeedItems(
			[item('meditate', ['meditation']), item('screen-warning', ['screen-time'], 'warning')],
			[item('sync', ['sleep'], 'blocking')]
		);
		expect(result.map(({ id }) => id)).toEqual(['sync', 'screen-warning', 'meditate']);
	});

	it('keeps every relevant native and tracker action', () => {
		const result = mergeActionFeedItems(
			[item('meditate', ['meditation']), item('breathe', ['breathing'])],
			[item('health', ['steps'], 'blocking'), item('usage', ['sleep'], 'blocking')]
		);
		expect(result.map(({ id }) => id)).toEqual(['health', 'usage', 'meditate', 'breathe']);
	});
});

function item(
	id: string,
	trackerIds: ActionFeedItem['trackerIds'],
	priority: ActionFeedItem['priority'] = 'activity'
): ActionFeedItem {
	return {
		id,
		trackerIds,
		priority,
		icon: 'tracker',
		title: id,
		action: { type: 'navigate', href: '/' }
	};
}
