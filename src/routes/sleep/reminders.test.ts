import { describe, expect, it } from 'vitest';
import { nextReminderAt } from './reminders';

describe('bedtime reminders', () => {
	it('schedules 15 minutes before bedtime on the same day', () => {
		const now = new Date(2026, 7, 17, 12, 0);
		expect(nextReminderAt('22:30', now)).toEqual(new Date(2026, 7, 17, 22, 15));
	});

	it('moves to tomorrow after tonight’s reminder time has passed', () => {
		const now = new Date(2026, 7, 17, 22, 16);
		expect(nextReminderAt('22:30', now)).toEqual(new Date(2026, 7, 18, 22, 15));
	});
});
