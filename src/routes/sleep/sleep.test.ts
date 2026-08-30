import { describe, expect, it } from 'vitest';
import { formatTimeUntilBedtime } from './sleep';

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
