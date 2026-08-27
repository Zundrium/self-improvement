import { describe, expect, it } from 'vitest';
import { buildActionEnvironment } from './environment';

describe('action environment', () => {
	it('derives local date and time once in the requested time zone', () => {
		const now = new Date('2026-04-10T23:30:00.000Z');
		expect(buildActionEnvironment(now, 'Europe/Amsterdam')).toEqual({
			now,
			timeZone: 'Europe/Amsterdam',
			localDate: '2026-04-11',
			localMinuteOfDay: 90
		});
	});
});
