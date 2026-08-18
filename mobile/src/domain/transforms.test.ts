import { CalendarDate } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { parseScreenTimePayload } from '../../../src/routes/(trackers)/screen-time/screen-time';
import { parseHealthConnectSleepPayload } from '../../../src/routes/(trackers)/sleep/sleep';
import { parseHealthConnectPayload } from '../../../src/routes/(trackers)/steps/steps';
import { toLocalDayRange } from './day-ranges';
import { COMPANION_PACKAGE, buildScreenTimePayload, type NativeUsageStats } from './screen-time';
import { buildSleepPayload, type NativeSleepSample } from './sleep';
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
	const sample: NativeSleepSample = {
		startDate: '2025-11-02T22:00:00.000Z',
		endDate: '2025-11-02T23:30:00.000Z',
		sourceName: 'Device name',
		sourceId: 'com.health.source',
		hasStageData: true,
		stages: [
			{
				stage: 'light',
				startDate: '2025-11-02T22:00:00.000Z',
				endDate: '2025-11-02T23:00:00.000Z'
			},
			{
				stage: 'rem',
				startDate: '2025-11-02T23:00:00.000Z',
				endDate: '2025-11-02T23:30:00.000Z'
			}
		]
	};

	it('preserves session end, calculated duration, stage detail, and source', () => {
		const payload = buildSleepPayload([sample], days, timestamp, appVersion);
		const session = payload.sleep[0];

		expect(parseHealthConnectSleepPayload(payload)).toEqual(payload);
		expect(session).toEqual({
			session_end_time: '2025-11-02T23:30:00.000Z',
			duration_seconds: 5_400,
			stages: [
				{
					stage: 'light',
					start_time: '2025-11-02T22:00:00.000Z',
					end_time: '2025-11-02T23:00:00.000Z',
					duration_seconds: 3_600
				},
				{
					stage: 'rem',
					start_time: '2025-11-02T23:00:00.000Z',
					end_time: '2025-11-02T23:30:00.000Z',
					duration_seconds: 1_800
				}
			],
			metadata: { data_origin: 'com.health.source' }
		});
	});

	it('assigns a session crossing into the first day by its end time', () => {
		const crossingSession: NativeSleepSample = {
			...sample,
			startDate: '2025-11-01T23:00:00.000Z',
			endDate: '2025-11-02T01:00:00.000Z',
			stages: [
				{
					stage: 'asleep',
					startDate: '2025-11-01T23:00:00.000Z',
					endDate: '2025-11-02T01:00:00.000Z'
				}
			]
		};

		expect(buildSleepPayload([crossingSession], days, timestamp, appVersion).sleep).toMatchObject([
			{ session_end_time: '2025-11-02T01:00:00.000Z', duration_seconds: 7_200 }
		]);
	});

	it('fails the tracker when Health Connect reports stage detail unavailable', () => {
		expect(() =>
			buildSleepPayload([{ ...sample, hasStageData: false }], days, timestamp, appVersion)
		).toThrow('Sleep stage detail is unavailable');
	});

	it('enforces the endpoint session limit without truncating', () => {
		const samples = Array.from({ length: 101 }, (_, index) => ({
			...sample,
			endDate: new Date(Date.parse('2025-11-02T02:00:00.000Z') + index * 60_000).toISOString()
		}));

		expect(() => buildSleepPayload(samples, days, timestamp, appVersion)).toThrow(
			'Too many sleep sessions'
		);
	});

	it('enforces the endpoint stage limit without truncating', () => {
		const stages = Array.from(
			{ length: 201 },
			() => sample.stages?.[0] as NonNullable<NativeSleepSample['stages']>[number]
		);

		expect(() => buildSleepPayload([{ ...sample, stages }], days, timestamp, appVersion)).toThrow(
			'Too many sleep stages'
		);
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
		stats[COMPANION_PACKAGE] = usage(COMPANION_PACKAGE, 12 * 60 * 60_000);
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
		expect(day.apps.some((app) => app.package === COMPANION_PACKAGE)).toBe(false);
		expect(day.apps.some((app) => app.package === 'com.example.too-short')).toBe(false);
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
