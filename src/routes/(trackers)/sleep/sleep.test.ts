import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SLEEP_GOAL_MINUTES,
	MAX_SLEEP_SESSIONS,
	MAX_SLEEP_STAGES,
	averageSleepMinutes,
	calculateSleepSession,
	measuredSleepSeconds,
	parseHealthConnectSleepPayload,
	parseSleepGoal
} from './sleep';

const sleepRecord = {
	session_end_time: '2026-08-17T07:00:00Z',
	duration_seconds: 27_000,
	stages: [
		{
			stage: 'deep',
			start_time: '2026-08-16T23:30:00Z',
			end_time: '2026-08-17T01:30:00Z',
			duration_seconds: 7_200
		},
		{
			stage: 'rem',
			start_time: '2026-08-17T01:30:00Z',
			end_time: '2026-08-17T05:00:00Z',
			duration_seconds: 12_600
		}
	],
	metadata: { data_origin: 'com.example.sleep' }
};

const validPayload = {
	timestamp: '2026-08-17T12:00:00Z',
	app_version: '1.9.14',
	sleep: [sleepRecord]
};

describe('HC Webhook sleep payloads', () => {
	it('accepts the documented session and stage shape', () => {
		const payload = parseHealthConnectSleepPayload(validPayload);
		expect(payload.sleep[0].duration_seconds).toBe(27_000);
		expect(payload.sleep[0].stages[0].stage).toBe('deep');
	});

	it('accepts a payload without sleep records', () => {
		const payload = parseHealthConnectSleepPayload({
			timestamp: validPayload.timestamp,
			app_version: validPayload.app_version
		});
		expect(payload.sleep).toEqual([]);
	});

	it('rejects invalid stage intervals and durations', () => {
		expect(() =>
			parseHealthConnectSleepPayload({
				...validPayload,
				sleep: [
					{
						...sleepRecord,
						stages: [
							{
								stage: 'deep',
								start_time: '2026-08-17T02:00:00Z',
								end_time: '2026-08-17T01:00:00Z',
								duration_seconds: 3_600
							}
						]
					}
				]
			})
		).toThrow('ends before it starts');

		expect(() =>
			parseHealthConnectSleepPayload({
				...validPayload,
				sleep: [
					{
						...sleepRecord,
						stages: [{ ...sleepRecord.stages[0], duration_seconds: 60 }]
					}
				]
			})
		).toThrow('duration does not match');
	});

	it('caps sessions and stages', () => {
		expect(() =>
			parseHealthConnectSleepPayload({
				...validPayload,
				sleep: Array.from({ length: MAX_SLEEP_SESSIONS + 1 }, () => sleepRecord)
			})
		).toThrow();
		expect(() =>
			parseHealthConnectSleepPayload({
				...validPayload,
				sleep: [
					{
						...sleepRecord,
						stages: Array.from({ length: MAX_SLEEP_STAGES + 1 }, () => sleepRecord.stages[0])
					}
				]
			})
		).toThrow();
	});
});

describe('sleep goals', () => {
	it('uses seven hours by default and validates custom goals', () => {
		expect(DEFAULT_SLEEP_GOAL_MINUTES).toBe(420);
		expect(parseSleepGoal('480')).toBe(480);
		expect(() => parseSleepGoal('59')).toThrow('between 60 and 1,440');
		expect(() => parseSleepGoal('1441')).toThrow('between 60 and 1,440');
		expect(() => parseSleepGoal('420.5')).toThrow('between 60 and 1,440');
	});
});

describe('sleep date and session calculations', () => {
	it('derives the session start from its end and duration', () => {
		const record = parseHealthConnectSleepPayload(validPayload).sleep[0];
		const session = calculateSleepSession(record, 'UTC');
		expect(session.sessionStartAt.toISOString()).toBe('2026-08-16T23:30:00.000Z');
		expect(session.sessionEndAt.toISOString()).toBe('2026-08-17T07:00:00.000Z');
	});

	it('subtracts awake stages and falls back to the full session without stages', () => {
		const record = parseHealthConnectSleepPayload(validPayload).sleep[0];
		const withAwakeStage = {
			...record,
			stages: [
				...record.stages,
				{
					stage: '1',
					start_time: '2026-08-17T05:00:00Z',
					end_time: '2026-08-17T05:30:00Z',
					duration_seconds: 1_800
				}
			]
		};
		expect(measuredSleepSeconds(withAwakeStage)).toBe(25_200);
		expect(measuredSleepSeconds({ ...record, stages: [] })).toBe(27_000);
	});

	it('assigns a session to the local date on which it ends', () => {
		const payload = parseHealthConnectSleepPayload({
			...validPayload,
			sleep: [{ ...sleepRecord, session_end_time: '2026-08-17T22:30:00Z', stages: [] }]
		});
		expect(calculateSleepSession(payload.sleep[0], 'Europe/Amsterdam').localDate).toBe(
			'2026-08-18'
		);
	});

	it('averages recorded nights in the seven-day history', () => {
		expect(
			averageSleepMinutes([
				{ durationSeconds: 420 * 60 },
				{ durationSeconds: 480 * 60 },
				{ durationSeconds: 0 }
			])
		).toBe(450);
	});
});
