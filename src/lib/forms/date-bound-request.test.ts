import { describe, expect, it } from 'vitest';
import { DateBoundRequestLifetime } from './date-bound-request';

describe('DateBoundRequestLifetime', () => {
	it('accepts only the latest request for the active date', () => {
		const lifetime = new DateBoundRequestLifetime('2026-04-10');
		const first = lifetime.begin();
		expect(lifetime.isCurrent(first, '2026-04-10')).toBe(true);
		const second = lifetime.begin();
		expect(lifetime.isCurrent(first, '2026-04-10')).toBe(false);
		expect(lifetime.isCurrent(second, '2026-04-10')).toBe(true);
	});

	it('invalidates a request after leaving and returning to its date', () => {
		const lifetime = new DateBoundRequestLifetime('2026-04-10');
		const request = lifetime.begin();

		lifetime.syncDate('2026-04-11');
		lifetime.syncDate('2026-04-10');

		expect(lifetime.isCurrent(request, '2026-04-10')).toBe(false);
	});

	it('requires the submitted date to still be selected', () => {
		const lifetime = new DateBoundRequestLifetime('2026-04-10');
		const request = lifetime.begin();

		expect(lifetime.isCurrent(request, '2026-04-11')).toBe(false);
	});

	it('invalidates requests when disposed', () => {
		const lifetime = new DateBoundRequestLifetime('2026-04-10');
		const request = lifetime.begin();

		lifetime.dispose();

		expect(lifetime.isCurrent(request, '2026-04-10')).toBe(false);
	});
});
