import { CalendarDate } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { rollingLocalDayRanges, toLocalDayRange } from './day-ranges';

const HOUR = 60 * 60 * 1000;

describe('local day ranges', () => {
	it('uses a 23-hour local-midnight interval across spring DST', () => {
		const range = toLocalDayRange(new CalendarDate(2025, 3, 9), 'America/New_York');

		expect(range).toMatchObject({
			date: '2025-03-09',
			start: '2025-03-09T05:00:00.000Z',
			end: '2025-03-10T04:00:00.000Z'
		});
		expect(range.endMilliseconds - range.startMilliseconds).toBe(23 * HOUR);
	});

	it('uses a 25-hour local-midnight interval across fall DST', () => {
		const range = toLocalDayRange(new CalendarDate(2025, 11, 2), 'America/New_York');

		expect(range).toMatchObject({
			date: '2025-11-02',
			start: '2025-11-02T04:00:00.000Z',
			end: '2025-11-03T05:00:00.000Z'
		});
		expect(range.endMilliseconds - range.startMilliseconds).toBe(25 * HOUR);
	});

	it('returns seven ascending local days ending on the paired-zone date', () => {
		const ranges = rollingLocalDayRanges(
			new Date('2025-03-10T01:30:00.000Z'),
			'America/Los_Angeles'
		);

		expect(ranges.map(({ date }) => date)).toEqual([
			'2025-03-03',
			'2025-03-04',
			'2025-03-05',
			'2025-03-06',
			'2025-03-07',
			'2025-03-08',
			'2025-03-09'
		]);
	});
});
