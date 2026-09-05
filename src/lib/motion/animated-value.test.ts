import { describe, expect, it } from 'vitest';
import { valueInterpolator } from './animated-value';

describe('animated metric formatting', () => {
	it('counts grouped calories, decimal macros, and negative values', () => {
		expect(valueInterpolator('999', '2,001')?.(0.5)).toBe('1,500');
		expect(valueInterpolator('10.5g', '20.5g')?.(0.5)).toBe('15.5g');
		expect(valueInterpolator('-5', '5')?.(0.5)).toBe('0');
	});

	it('finishes on the exact target string and preserves zero padding', () => {
		expect(valueInterpolator('01:00', '01:30')?.(0.5)).toBe('01:15');
		expect(valueInterpolator('1,000', '500')?.(1)).toBe('500');
	});

	it('never invents numbers for empty or differently formatted states', () => {
		expect(valueInterpolator('No data', '100')).toBeUndefined();
		expect(valueInterpolator('59m', '1h 10m')).toBeUndefined();
		expect(valueInterpolator('10g', '10%')).toBeUndefined();
	});
});
