import { describe, expect, it } from 'vitest';
import { selectedGamificationDate } from './dates';

describe('selectedGamificationDate', () => {
	it('rejects impossible and future calendar dates', () => {
		const today = '2026-09-05';
		expect(selectedGamificationDate(new URL('https://app.test/shop?date=2026-02-31'), today)).toBe(
			today
		);
		expect(selectedGamificationDate(new URL('https://app.test/shop?date=2026-09-06'), today)).toBe(
			today
		);
	});
});
