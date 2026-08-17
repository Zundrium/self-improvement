import { describe, expect, it } from 'vitest';
import { cycleSummary, flowLabel, isValidDate } from './period';

describe('period entries', () => {
	it('validates dates and formats flows', () => {
		expect(isValidDate('2026-08-17')).toBe(true);
		expect(isValidDate('2026-02-30')).toBe(false);
		expect(flowLabel('spotting')).toBe('Spotting');
	});

	it('groups consecutive days into cycles', () => {
		const summary = cycleSummary(
			['2026-06-01', '2026-06-02', '2026-06-29', '2026-06-30', '2026-07-27'],
			'2026-08-01'
		);
		expect(summary).toEqual({
			lastPeriodStarted: '2026-07-27',
			averageCycleDays: 28,
			averageFromHistory: true,
			estimatedNextPeriod: '2026-08-24'
		});
	});

	it('uses a 28-day estimate until history is available', () => {
		expect(cycleSummary(['2026-08-01'], '2026-08-05')?.estimatedNextPeriod).toBe('2026-08-29');
	});
});
