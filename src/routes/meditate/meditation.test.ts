import { describe, expect, it } from 'vitest';
import { formatDuration, formatTimer, getLocalDate, isValidLocalDate } from './meditation';

describe('meditation formatting', () => {
	it('formats timer values', () => {
		expect(formatTimer(65)).toBe('01:05');
		expect(formatTimer(60 * 120)).toBe('120:00');
	});

	it('formats session durations', () => {
		expect(formatDuration(5 * 60)).toBe('5 min');
		expect(formatDuration(65 * 60)).toBe('1 hr 5 min');
	});
});

describe('meditation local dates', () => {
	it('creates a local date key', () => {
		expect(getLocalDate(new Date(2026, 7, 17, 23, 30))).toBe('2026-08-17');
	});

	it('rejects impossible dates', () => {
		expect(isValidLocalDate('2026-02-29')).toBe(false);
		expect(isValidLocalDate('2026-13-01')).toBe(false);
		expect(isValidLocalDate('2028-02-29')).toBe(true);
	});
});
