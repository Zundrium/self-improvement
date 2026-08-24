import { describe, expect, it } from 'vitest';
import {
	bedtimeWindow,
	calculateSleepAdherence,
	DEFAULT_BEDTIME,
	LATE_USAGE_LIMIT_SECONDS,
	parseBedtime,
	parseSleepUsagePayload
} from './sleep';

const selectedPackage = 'com.example.social';
const date = '2026-08-17';

function payload(overrides: Record<string, unknown> = {}) {
	return parseSleepUsagePayload({
		timestamp: '2026-08-18T03:00:00.000Z',
		app_version: '1.0.0',
		source: 'usage_events',
		dates: [date],
		activity_intervals: [],
		screen_interactive: [],
		...overrides
	});
}

function calculate(input = payload(), trackedPackages = new Set([selectedPackage])) {
	return calculateSleepAdherence({
		date,
		bedtime: DEFAULT_BEDTIME,
		timeZone: 'UTC',
		payload: input,
		trackedPackages
	});
}

describe('sleep usage payloads', () => {
	it('validates unique dates and ordered activity intervals', () => {
		expect(() => payload({ dates: [date, date] })).toThrow('must be unique');
		expect(() =>
			payload({
				activity_intervals: [usage('2026-08-17T23:00:00Z', '2026-08-17T22:59:00Z')]
			})
		).toThrow('must end after');
	});

	it('uses 22:30 as the default and validates a local wall-clock bedtime', () => {
		expect(DEFAULT_BEDTIME).toBe('22:30');
		expect(parseBedtime('07:05')).toBe('07:05');
		expect(() => parseBedtime('24:00')).toThrow('valid bedtime');
	});
});

describe('bedtime adherence', () => {
	it('fails only above 300 cumulative selected-app foreground seconds', () => {
		const atLimit = calculate(
			payload({
				activity_intervals: [usage('2026-08-17T22:30:00Z', '2026-08-17T22:35:00Z')]
			})
		);
		const aboveLimit = calculate(
			payload({
				activity_intervals: [usage('2026-08-17T22:30:00Z', '2026-08-17T22:35:01Z')]
			})
		);

		expect(LATE_USAGE_LIMIT_SECONDS).toBe(300);
		expect(atLimit).toMatchObject({ lateUsageSeconds: 300, status: 'pass' });
		expect(aboveLimit).toMatchObject({ lateUsageSeconds: 301, status: 'fail' });
		expect(aboveLimit.violatingApps).toEqual([
			expect.objectContaining({ package: selectedPackage, seconds: 301 })
		]);
	});

	it('compares cumulative foreground milliseconds before rounding for display', () => {
		const result = calculate(
			payload({
				activity_intervals: [
					usage('2026-08-17T22:30:00.000Z', '2026-08-17T22:32:30.000Z'),
					usage('2026-08-17T22:33:00.000Z', '2026-08-17T22:35:30.001Z')
				]
			})
		);

		expect(result).toMatchObject({ lateUsageSeconds: 301, status: 'fail' });
	});

	it('ignores unselected apps when deciding the result', () => {
		const result = calculate(
			payload({
				activity_intervals: [
					usage('2026-08-17T22:30:00Z', '2026-08-17T23:30:00Z', 'com.example.reader')
				]
			})
		);

		expect(result.status).toBe('pass');
		expect(result.lateUsageSeconds).toBe(0);
		expect(result.usedApps[0]).toMatchObject({ package: 'com.example.reader', seconds: 3_600 });
	});

	it('retains the latest screen-interactive event without using it to fail', () => {
		const result = calculate(
			payload({
				screen_interactive: [
					'2026-08-17T23:00:00.000Z',
					'2026-08-18T01:45:00.000Z',
					'2026-08-18T03:00:00.000Z'
				]
			})
		);

		expect(result.status).toBe('pass');
		expect(result.latestScreenActivityAt?.toISOString()).toBe('2026-08-18T01:45:00.000Z');
	});

	it('stays pending until the window ends or while no apps are selected', () => {
		const beforeWindowEnd = calculate(payload({ timestamp: '2026-08-18T02:29:59.000Z' }));
		const noAllowlist = calculate(payload(), new Set());

		expect(beforeWindowEnd.status).toBe('pending');
		expect(noAllowlist.status).toBe('pending');
	});

	it('builds a four-hour instant window from the configured local bedtime', () => {
		const window = bedtimeWindow(date, '22:30', 'Europe/Amsterdam');
		expect(window.start.toISOString()).toBe('2026-08-17T20:30:00.000Z');
		expect(window.end.getTime() - window.start.getTime()).toBe(4 * 60 * 60 * 1_000);
	});
});

function usage(start_time: string, end_time: string, packageName = selectedPackage) {
	return {
		package: packageName,
		name: 'Example app',
		start_time,
		end_time
	};
}
