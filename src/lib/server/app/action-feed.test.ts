import { describe, expect, it } from 'vitest';
import type { ActionFeedItem } from '$lib/server/action-feed';
import { buildActionItems, dateActionItems } from './action-feed';
import { preferredTimeZone } from './day-summary';

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

	it('integrates the permanent fasting card with its nutrition day', () => {
		const summary = {
			date: '2026-08-20',
			today: '2026-08-21',
			timeZone: 'UTC',
			nutritionFasting: true,
			nutritionEatingWindow: { enabled: true, start: '12:00', end: '20:00' }
		} as never;
		const items = dateActionItems(buildActionItems(summary, ['nutrition']), summary);

		expect(items).toEqual([
			expect.objectContaining({
				id: 'nutrition:fasting:2026-08-20',
				action: { type: 'navigate', href: '/nutrition/log/2026-08-20' }
			})
		]);
	});

	it('keeps fasting and eating-window actions together today', () => {
		const summary = {
			date: '2026-08-21',
			today: '2026-08-21',
			timeZone: 'America/New_York',
			nutritionFasting: true,
			nutritionEatingWindow: { enabled: true, start: '12:00', end: '20:00' }
		} as never;
		const context = { now: new Date('2026-08-21T15:00:00Z'), timeZone: 'America/New_York' };
		const items = buildActionItems(summary, ['nutrition'], context);

		expect(items).toEqual([
			expect.objectContaining({ id: 'nutrition:fasting:2026-08-21' }),
			expect.objectContaining({
				id: 'nutrition:eating-window:2026-08-21',
				title: 'Eating time starts in 1 hour',
				action: { type: 'navigate', href: '/nutrition/settings' }
			})
		]);
	});
});

describe('action feed timezone', () => {
	it('prefers a valid device timezone and safely falls back', () => {
		expect(preferredTimeZone('Europe/Amsterdam', ['UTC'])).toBe('Europe/Amsterdam');
		expect(preferredTimeZone('not/a-timezone', ['America/New_York'])).toBe('America/New_York');
		expect(preferredTimeZone('x'.repeat(101), [null])).toBe('UTC');
	});
});
