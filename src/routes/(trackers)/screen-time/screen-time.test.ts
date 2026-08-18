import { describe, expect, it } from 'vitest';
import {
	formatScreenTime,
	MAX_APPS_PER_DAY,
	MAX_DAILY_MINUTES,
	MAX_SCREEN_TIME_DAYS,
	parseScreenTimePayload,
	summarizeUsage,
	topApps
} from './screen-time';

const validApp = {
	package: 'com.instagram.android',
	name: 'Instagram',
	minutes: 45,
	last_used: '2026-08-17T11:30:00Z'
};

const validPayload = {
	timestamp: '2026-08-17T12:00:00Z',
	app_version: '1.2.0',
	device: 'Google Pixel 8',
	source: 'screen_time',
	screen_time: [
		{
			date: '2026-08-17',
			total_screen_time_minutes: 180,
			apps: [validApp]
		}
	]
};

describe('Life Dashboard Companion screen-time payloads', () => {
	it('accepts the documented payload and optional metadata', () => {
		const parsed = parseScreenTimePayload(validPayload);
		expect(parsed.screen_time[0].apps[0]).toEqual(validApp);
		expect(
			parseScreenTimePayload({
				...validPayload,
				device: undefined,
				source: undefined
			}).screen_time
		).toHaveLength(1);
	});

	it('caps daily snapshots and per-day apps', () => {
		const tooManyDays = Array.from({ length: MAX_SCREEN_TIME_DAYS + 1 }, (_, index) => ({
			...validPayload.screen_time[0],
			date: `2026-08-${String(index + 1).padStart(2, '0')}`
		}));
		const tooManyApps = Array.from({ length: MAX_APPS_PER_DAY + 1 }, (_, index) => ({
			...validApp,
			package: `com.example.app${index}`
		}));

		expect(() => parseScreenTimePayload({ ...validPayload, screen_time: tooManyDays })).toThrow();
		expect(() =>
			parseScreenTimePayload({
				...validPayload,
				screen_time: [{ ...validPayload.screen_time[0], apps: tooManyApps }]
			})
		).toThrow();
	});

	it('rejects oversized strings, minutes, and invalid instants', () => {
		expect(() => parseScreenTimePayload({ ...validPayload, device: 'x'.repeat(121) })).toThrow();
		expect(() =>
			parseScreenTimePayload({
				...validPayload,
				screen_time: [
					{
						...validPayload.screen_time[0],
						total_screen_time_minutes: MAX_DAILY_MINUTES + 1
					}
				]
			})
		).toThrow();
		expect(() =>
			parseScreenTimePayload({
				...validPayload,
				screen_time: [
					{
						...validPayload.screen_time[0],
						apps: [{ ...validApp, last_used: 'not-an-instant' }]
					}
				]
			})
		).toThrow();
	});
});

describe('screen-time dates', () => {
	it('rejects invalid calendar dates and duplicate snapshots', () => {
		expect(() =>
			parseScreenTimePayload({
				...validPayload,
				screen_time: [{ ...validPayload.screen_time[0], date: '2026-02-30' }]
			})
		).toThrow();
		expect(() =>
			parseScreenTimePayload({
				...validPayload,
				screen_time: [validPayload.screen_time[0], validPayload.screen_time[0]]
			})
		).toThrow('dates must be unique');
	});

	it('rejects duplicate packages within a day', () => {
		expect(() =>
			parseScreenTimePayload({
				...validPayload,
				screen_time: [{ ...validPayload.screen_time[0], apps: [validApp, validApp] }]
			})
		).toThrow('packages must be unique');
	});
});

describe('screen-time presentation helpers', () => {
	it('formats minute totals', () => {
		expect(formatScreenTime(0)).toBe('0m');
		expect(formatScreenTime(65)).toBe('1h 5m');
		expect(formatScreenTime(120)).toBe('2h');
	});

	it('summarizes calendar days including zero-use days', () => {
		expect(
			summarizeUsage([{ totalMinutes: 60 }, { totalMinutes: 0 }, { totalMinutes: 30 }])
		).toEqual({ totalMinutes: 90, averageMinutes: 30, maxMinutes: 60 });
		expect(summarizeUsage([])).toEqual({ totalMinutes: 0, averageMinutes: 0, maxMinutes: 1 });
	});

	it('returns the highest-usage apps without mutating the payload', () => {
		const apps = [validApp, { ...validApp, package: 'com.example', name: 'Example', minutes: 90 }];
		expect(topApps(apps, 1)[0].name).toBe('Example');
		expect(apps[0].name).toBe('Instagram');
	});
});
