import { CalendarDate } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { parseScreenTimePayload } from '../routes/screen-time/screen-time';
import { parseHealthConnectPayload } from '../routes/steps/steps';
import { toLocalDayRange } from './day-ranges';
import { APP_PACKAGE, buildScreenTimePayload, type NativeUsageStats } from './screen-time';
import { buildSleepPayload } from './sleep';
import { buildStepsPayload, rollingStepDayRanges } from './steps';

const timestamp = new Date('2025-11-03T12:00:00.000Z');
const appVersion = '1.2.3';

describe('steps payload transformation', () => {
	it('sums every aggregate bucket into one local-midnight daily snapshot', () => {
		const range = toLocalDayRange(new CalendarDate(2025, 11, 2), 'America/New_York');
		const payload = buildStepsPayload(
			[{ range, samples: [{ value: 4_000 }, { value: 1_500, values: { sum: 1_500 } }] }],
			timestamp,
			appVersion
		);

		expect(parseHealthConnectPayload(payload)).toEqual(payload);
		expect(payload).toEqual({
			timestamp: timestamp.toISOString(),
			app_version: appVersion,
			steps: [
				{
					count: 5_500,
					start_time: '2025-11-02T04:00:00.000Z',
					end_time: '2025-11-03T05:00:00.000Z'
				}
			]
		});
	});

	it('ends only the current local day at the collection instant', () => {
		const days = rollingStepDayRanges(timestamp, 'America/New_York', 2);
		const completeToday = toLocalDayRange(new CalendarDate(2025, 11, 3), 'America/New_York');
		const payload = buildStepsPayload(
			[days[0], completeToday].map((range) => ({ range, samples: [{ value: 100 }] })),
			timestamp,
			appVersion
		);

		expect(days[0]).toMatchObject({
			date: '2025-11-02',
			end: '2025-11-03T05:00:00.000Z'
		});
		expect(days[1]).toMatchObject({
			date: '2025-11-03',
			end: timestamp.toISOString(),
			endMilliseconds: timestamp.getTime()
		});
		expect(payload.steps.map(({ end_time }) => end_time)).toEqual([
			'2025-11-03T05:00:00.000Z',
			timestamp.toISOString()
		]);
	});

	it('rejects an invalid aggregate instead of weakening the daily value', () => {
		const range = toLocalDayRange(new CalendarDate(2025, 11, 2), 'UTC');

		expect(() =>
			buildStepsPayload([{ range, samples: [{ value: 1.5 }] }], timestamp, appVersion)
		).toThrow();
	});
});

describe('sleep payload transformation', () => {
	const days = [toLocalDayRange(new CalendarDate(2025, 11, 2), 'UTC')];

	it('preserves detailed foreground intervals, labels, and screen-interactive events', () => {
		const payload = buildSleepPayload(
			{
				activityIntervals: [
					{
						packageName: 'com.example.social',
						startTime: Date.parse('2025-11-02T22:30:00.000Z'),
						endTime: Date.parse('2025-11-02T22:35:01.000Z')
					},
					{
						packageName: APP_PACKAGE,
						startTime: Date.parse('2025-11-02T23:00:00.000Z'),
						endTime: Date.parse('2025-11-02T23:01:00.000Z')
					}
				],
				screenInteractive: [Date.parse('2025-11-02T22:45:00.000Z')],
				appLabels: { 'com.example.social': 'Social' }
			},
			days,
			timestamp,
			appVersion
		);

		expect(payload).toEqual({
			timestamp: timestamp.toISOString(),
			app_version: appVersion,
			source: 'usage_events',
			dates: ['2025-11-02'],
			activity_intervals: [
				{
					package: 'com.example.social',
					name: 'Social',
					start_time: '2025-11-02T22:30:00.000Z',
					end_time: '2025-11-02T22:35:01.000Z'
				}
			],
			screen_interactive: ['2025-11-02T22:45:00.000Z']
		});
	});

	it('rejects invalid native activity intervals', () => {
		expect(() =>
			buildSleepPayload(
				{
					activityIntervals: [{ packageName: 'app', startTime: 200, endTime: 100 }],
					screenInteractive: []
				},
				days,
				timestamp,
				appVersion
			)
		).toThrow();
	});
});

describe('screen-time payload transformation', () => {
	const range = toLocalDayRange(new CalendarDate(2025, 11, 2), 'UTC');

	it('limits apps while calculating the total from every valid app', () => {
		const stats = Object.fromEntries(
			Array.from({ length: 105 }, (_, index) => {
				const packageName = `com.example.app${String(index).padStart(3, '0')}`;
				return [packageName, usage(packageName, 60_000)];
			})
		);
		stats[APP_PACKAGE] = usage(APP_PACKAGE, 12 * 60 * 60_000);
		stats['com.example.too-short'] = usage('com.example.too-short', 29_000);
		const payload = buildScreenTimePayload([{ range, stats }], timestamp, appVersion);
		const day = payload.screen_time[0];

		expect(parseScreenTimePayload(payload)).toEqual(payload);
		expect(day.total_screen_time_minutes).toBe(105);
		expect(day.apps).toHaveLength(100);
		expect(day.apps[0]).toMatchObject({
			package: 'com.example.app000',
			name: 'com.example.app000',
			minutes: 1
		});
		expect(day.apps.some((app) => app.package === APP_PACKAGE)).toBe(false);
		expect(day.apps.some((app) => app.package === 'com.example.too-short')).toBe(false);
	});

	it('uses Android labels and falls back to packages when unavailable', () => {
		const payload = buildScreenTimePayload(
			[
				{
					range,
					stats: {
						browser: usage('com.example.browser', 60_000),
						unknown: usage('com.example.unknown', 60_000)
					},
					appLabels: { 'com.example.browser': 'Browser' }
				}
			],
			timestamp,
			appVersion
		);

		expect(payload.screen_time[0].apps).toMatchObject([
			{ package: 'com.example.browser', name: 'Browser' },
			{ package: 'com.example.unknown', name: 'com.example.unknown' }
		]);
	});

	it('keeps a 255-character package with a safe 120-character fallback label', () => {
		const packageName = `com.example.${'a'.repeat(243)}`;
		const payload = buildScreenTimePayload(
			[{ range, stats: { long: usage(packageName, 60_000) } }],
			timestamp,
			appVersion
		);
		const app = payload.screen_time[0].apps[0];

		expect(packageName).toHaveLength(255);
		expect(app.package).toBe(packageName);
		expect(app.name).toHaveLength(120);
		expect(parseScreenTimePayload(payload)).toEqual(payload);
	});

	it('rejects app minutes above the daily maximum instead of clamping', () => {
		expect(() =>
			buildScreenTimePayload(
				[{ range, stats: { invalid: usage('com.example.invalid', 1_441 * 60_000) } }],
				timestamp,
				appVersion
			)
		).toThrow();
	});

	it('rejects a day total above the daily maximum instead of clamping', () => {
		const stats = {
			first: usage('com.example.first', 800 * 60_000),
			second: usage('com.example.second', 800 * 60_000)
		};

		expect(() => buildScreenTimePayload([{ range, stats }], timestamp, appVersion)).toThrow();
	});
});

function usage(packageName: string, totalTimeInForeground: number): NativeUsageStats {
	return {
		packageName,
		totalTimeInForeground,
		lastTimeUsed: Date.parse('2025-11-02T18:00:00.000Z')
	};
}
