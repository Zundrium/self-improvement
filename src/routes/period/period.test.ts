import { describe, expect, it } from 'vitest';
import { cycleSummary } from './period';

describe('period cycle defaults', () => {
	it('uses the configured fallback until history provides an average', () => {
		expect(cycleSummary(['2026-03-01'], undefined, 35)).toMatchObject({
			averageCycleDays: 35,
			averageFromHistory: false,
			estimatedNextPeriod: '2026-04-05'
		});
		expect(cycleSummary(['2026-01-01', '2026-01-31'], undefined, 35)).toMatchObject({
			averageCycleDays: 30,
			averageFromHistory: true
		});
	});
});
