import { describe, expect, it } from 'vitest';
import type { SleepPayload, StepsPayload } from '$domain/payloads';
import { calculateBedtimeAdherence, processNativePayload } from './native-processing';
import { createDefaultAppState } from './state';

const context = { timeZone: 'UTC' };

describe('local native processing', () => {
	it('uses selected packages, a four-hour window, and a strict over-300-second failure', () => {
		const base = sleepPayload('2026-03-21T03:00:00.000Z', '2026-03-20T22:35:00.000Z');
		const passing = calculateBedtimeAdherence({
			date: '2026-03-20',
			bedtime: '22:30',
			timeZone: 'UTC',
			payload: base,
			trackedPackages: new Set(['selected.app'])
		});
		const failing = calculateBedtimeAdherence({
			date: '2026-03-20',
			bedtime: '22:30',
			timeZone: 'UTC',
			payload: sleepPayload('2026-03-21T03:00:00.000Z', '2026-03-20T22:35:01.000Z'),
			trackedPackages: new Set(['selected.app'])
		});

		expect(passing).toMatchObject({
			windowStartAt: '2026-03-20T22:30:00.000Z',
			windowEndAt: '2026-03-21T02:30:00.000Z',
			lateUsageSeconds: 300,
			status: 'pass'
		});
		expect(passing.violatingApps.map(({ package: packageName }) => packageName)).toEqual([
			'selected.app'
		]);
		expect(failing).toMatchObject({ lateUsageSeconds: 301, status: 'fail' });
	});

	it('accepts and retains a seven-day step payload', () => {
		const state = createDefaultAppState(new Date('2026-03-20T12:00:00.000Z'));
		const dates = ['14', '15', '16', '17', '18', '19', '20'];
		const payload: StepsPayload = {
			timestamp: '2026-03-20T12:00:00.000Z',
			app_version: '1.0.0',
			steps: dates.map((day, index) => ({
				count: (index + 1) * 1_000,
				start_time: `2026-03-${day}T00:00:00.000Z`,
				end_time:
					day === '20'
						? '2026-03-20T12:00:00.000Z'
						: `2026-03-${String(Number(day) + 1).padStart(2, '0')}T00:00:00.000Z`
			}))
		};

		processNativePayload(state, 'steps', context, payload);

		expect(state.steps.days).toHaveLength(7);
		expect(state.steps.days.at(-1)).toMatchObject({ date: '2026-03-20', count: 7_000 });
	});

	it('preserves older history when a new seven-day payload is processed', () => {
		const state = createDefaultAppState(new Date('2026-03-20T12:00:00.000Z'));
		processNativePayload(
			state,
			'screenTime',
			context,
			screenPayload('2026-03-14', '2026-03-20T12:00:00.000Z')
		);
		processNativePayload(
			state,
			'screenTime',
			context,
			screenPayload('2026-03-21', '2026-03-21T12:00:00.000Z')
		);

		expect(state.screenTime.days.map(({ date }) => date)).toEqual(['2026-03-14', '2026-03-21']);
	});
});

function sleepPayload(timestamp: string, selectedEnd: string): SleepPayload {
	return {
		timestamp,
		app_version: '1.0.0',
		source: 'usage_events',
		dates: ['2026-03-20'],
		activity_intervals: [
			{
				package: 'selected.app',
				name: 'Selected',
				start_time: '2026-03-20T22:30:00.000Z',
				end_time: selectedEnd
			},
			{
				package: 'ignored.app',
				name: 'Ignored',
				start_time: '2026-03-20T22:30:00.000Z',
				end_time: '2026-03-20T23:30:00.000Z'
			}
		],
		screen_interactive: []
	};
}

function screenPayload(date: string, timestamp: string) {
	return {
		timestamp,
		app_version: '1.0.0',
		source: 'screen_time' as const,
		screen_time: [{ date, total_screen_time_minutes: 10, apps: [] }]
	};
}
