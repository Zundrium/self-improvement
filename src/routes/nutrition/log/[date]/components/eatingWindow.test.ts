import { describe, expect, it } from 'vitest';
import { eatingWindowState } from './eatingWindow';

const schedule = { start: '12:00', end: '20:00' };

describe('eating window state', () => {
	it('opens at its start and closes at its end', () => {
		expect(eatingWindowState(schedule, new Date(2026, 7, 21, 12, 0))).toMatchObject({
			open: true,
			status: 'Eating window open'
		});
		expect(eatingWindowState(schedule, new Date(2026, 7, 21, 20, 0))).toMatchObject({
			open: false,
			status: 'Eating window closed'
		});
	});

	it('shows a concise daily schedule', () => {
		expect(eatingWindowState(schedule, new Date(2026, 7, 21, 13, 0)).schedule).toBe(
			'12:00 PM–8:00 PM daily'
		);
	});
});
