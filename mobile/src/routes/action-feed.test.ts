import { describe, expect, it } from 'vitest';
import type { ActionFeedItem } from '$lib/api-types';
import { mergeActionFeedItems } from './action-feed';

describe('action feed merging', () => {
	it('suppresses lower tracker actions while native access is blocked', () => {
		const serverItems = [
			item('sleep-data', ['sleep'], 'warning'),
			item('meditate', ['meditation'])
		];
		const nativeItems = [item('health-access', ['steps', 'sleep'], 'blocking')];
		const result = mergeActionFeedItems(serverItems, nativeItems);
		expect(result.map(({ id }) => id)).toEqual(['health-access', 'meditate']);
	});

	it('orders native and server items by priority', () => {
		const result = mergeActionFeedItems(
			[item('meditate', ['meditation']), item('screen-warning', ['screen-time'], 'warning')],
			[item('sync', ['sleep'], 'blocking')]
		);
		expect(result.map(({ id }) => id)).toEqual(['sync', 'screen-warning', 'meditate']);
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
