import { describe, expect, it } from 'vitest';
import type { ActionFeedItem } from '$lib/server/action-feed';
import { dateActionItems } from './action-feed';

const item: ActionFeedItem = {
	id: 'fitness:workout',
	trackerIds: ['fitness'],
	priority: 'activity',
	icon: 'tracker',
	title: 'Workout',
	action: { type: 'navigate', href: '/fitness' }
};

describe('dated action feed', () => {
	it('keeps today links unchanged', () => {
		expect(dateActionItems([item], { date: '2026-08-21', today: '2026-08-21' })).toEqual([item]);
	});

	it('keeps the selected date in tracker links', () => {
		const [datedItem] = dateActionItems([item], {
			date: '2026-08-20',
			today: '2026-08-21'
		});
		expect(datedItem.action).toEqual({ type: 'navigate', href: '/fitness?date=2026-08-20' });
	});
});
