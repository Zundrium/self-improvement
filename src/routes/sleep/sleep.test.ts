import { describe, expect, it } from 'vitest';
import { formatSleepTrackerMessage, formatTimeUntilBedtime, isWithinSleepingWindow } from './sleep';

describe('sleep countdown', () => {
	it('formats the time remaining before bedtime', () => {
		expect(formatTimeUntilBedtime('22:30', new Date(2026, 7, 17, 20, 15))).toBe(
			'2 hours 15 minutes'
		);
	});

	it('uses singular duration labels', () => {
		expect(formatTimeUntilBedtime('22:30', new Date(2026, 7, 17, 21, 29))).toBe('1 hour 1 minute');
	});

	it('shows bedtime during its first minute', () => {
		expect(formatTimeUntilBedtime('22:30', new Date(2026, 7, 17, 22, 30, 30))).toBe('Bedtime now');
	});

	it('counts down to tomorrow after bedtime', () => {
		expect(formatTimeUntilBedtime('22:30', new Date(2026, 7, 17, 22, 31))).toBe(
			'23 hours 59 minutes'
		);
	});
});

describe('sleeping message', () => {
	it('starts after an evening bedtime', () => {
		expect(isWithinSleepingWindow('22:30', new Date(2026, 7, 17, 22, 30, 1))).toBe(true);
		expect(formatSleepTrackerMessage('22:30', new Date(2026, 7, 17, 22, 30, 1))).toBe(
			'You should be sleeping :)'
		);
	});

	it('continues across midnight for an evening bedtime', () => {
		expect(isWithinSleepingWindow('22:30', new Date(2026, 7, 18, 0, 30))).toBe(true);
	});

	it('does not start early for a bedtime after midnight', () => {
		expect(formatSleepTrackerMessage('01:30', new Date(2026, 7, 18, 0, 30))).toBe('1 hour');
		expect(isWithinSleepingWindow('01:30', new Date(2026, 7, 18, 1, 30))).toBe(false);
		expect(isWithinSleepingWindow('01:30', new Date(2026, 7, 18, 1, 30, 1))).toBe(true);
	});

	it('ends at 06:00', () => {
		expect(isWithinSleepingWindow('22:30', new Date(2026, 7, 18, 5, 59, 59))).toBe(true);
		expect(formatSleepTrackerMessage('22:30', new Date(2026, 7, 18, 6, 0))).toBe(
			'16 hours 30 minutes'
		);
	});
});
