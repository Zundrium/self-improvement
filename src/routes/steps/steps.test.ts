import { describe, expect, it } from 'vitest';
import {
	DEFAULT_STEP_GOAL,
	dateKeysEndingAt,
	isLocalDayStart,
	isValidDateKey,
	isValidTimeZone,
	localDateForInstant,
	parseHealthConnectPayload,
	parseStepGoal
} from './steps';

const validPayload = {
	timestamp: '2026-08-17T12:00:00Z',
	app_version: '1.9.14',
	steps: [
		{
			count: 8421,
			start_time: '2026-08-16T22:00:00Z',
			end_time: '2026-08-17T12:00:00Z'
		}
	]
};

describe('Health Connect step payloads', () => {
	it('accepts the HC Webhook daily step shape', () => {
		expect(parseHealthConnectPayload(validPayload).steps[0].count).toBe(8421);
	});

	it('rejects backwards intervals', () => {
		expect(() =>
			parseHealthConnectPayload({
				...validPayload,
				steps: [
					{
						count: 10,
						start_time: '2026-08-17T12:00:00Z',
						end_time: '2026-08-17T11:00:00Z'
					}
				]
			})
		).toThrow('ends before it starts');
	});
});

describe('step dates', () => {
	it('uses the saved phone timezone', () => {
		const instant = '2026-08-16T22:00:00Z';
		expect(localDateForInstant(instant, 'Europe/Amsterdam')).toBe('2026-08-17');
		expect(isLocalDayStart(instant, 'Europe/Amsterdam')).toBe(true);
	});

	it('builds an inclusive date range', () => {
		expect(dateKeysEndingAt('2026-08-17', 3)).toEqual(['2026-08-15', '2026-08-16', '2026-08-17']);
	});

	it('validates calendar date keys', () => {
		expect(isValidDateKey('2026-08-17')).toBe(true);
		expect(isValidDateKey('2026-02-30')).toBe(false);
	});

	it('validates IANA timezones', () => {
		expect(isValidTimeZone('Europe/Amsterdam')).toBe(true);
		expect(isValidTimeZone('not/a-timezone')).toBe(false);
	});
});

describe('step goals', () => {
	it('uses the standard goal and validates custom values', () => {
		expect(DEFAULT_STEP_GOAL).toBe(5_000);
		expect(parseStepGoal('10000')).toBe(10_000);
		expect(() => parseStepGoal('500')).toThrow('between 1,000 and 100,000');
	});
});
