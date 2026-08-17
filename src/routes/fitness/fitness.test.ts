import { describe, expect, it } from 'vitest';
import { dateMatchesWorkoutDay, isValidCompletionDate } from './fitness';

describe('fitness completion dates', () => {
	it('accepts real local date keys', () => {
		expect(isValidCompletionDate('2026-02-28')).toBe(true);
		expect(isValidCompletionDate('2026-02-30')).toBe(false);
	});

	it('matches a workout to the calendar day', () => {
		expect(dateMatchesWorkoutDay('2026-08-17', 17)).toBe(true);
		expect(dateMatchesWorkoutDay('2026-08-17', 18)).toBe(false);
	});
});
