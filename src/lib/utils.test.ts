import { describe, expect, it } from 'vitest';
import { isValidCalendarDate, millisecondsUntilNextLocalMidnight, todayIso } from './utils';

describe('calendar date utilities', () => {
	it('validates real calendar dates', () => {
		expect(isValidCalendarDate('2026-02-28')).toBe(true);
		expect(isValidCalendarDate('2024-02-29')).toBe(true);
		expect(isValidCalendarDate('2026-02-31')).toBe(false);
		expect(isValidCalendarDate('2026-13-01')).toBe(false);
	});

	it('uses the local calendar date instead of the UTC date', () => {
		const date = new Date(2026, 8, 5, 0, 30);
		expect(todayIso(date)).toBe('2026-09-05');
	});

	it('refreshes at the following local midnight', () => {
		const date = new Date(2026, 8, 5, 23, 59, 30);
		expect(millisecondsUntilNextLocalMidnight(date)).toBe(30_000);
	});
});
