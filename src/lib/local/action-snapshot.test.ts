import { describe, expect, it } from 'vitest';
import { buildActionSnapshot } from './action-snapshot';
import { createDefaultAppState } from './state';

describe('action snapshot', () => {
	it('builds tracker facts from one local state document', () => {
		const state = createDefaultAppState(new Date('2026-04-10T12:00:00.000Z'));
		state.steps.days.push({
			date: '2026-04-10',
			count: 0,
			sourceEndAt: '2026-04-10T12:00:00.000Z'
		});
		state.fitness.defaultSets = 4;
		state.screenTime.trackedPackages = ['app.focus'];
		state.screenTime.days.push({
			date: '2026-04-10',
			totalMinutes: 90,
			apps: [
				{
					package: 'app.focus',
					name: 'Focus',
					minutes: 30,
					last_used: '2026-04-10T11:00:00.000Z'
				},
				{
					package: 'app.ignored',
					name: 'Ignored',
					minutes: 60,
					last_used: '2026-04-10T11:00:00.000Z'
				}
			],
			sourceTimestamp: '2026-04-10T12:00:00.000Z'
		});
		state.meditation.sessions.push({
			id: 'session',
			localDate: '2026-04-05',
			durationSeconds: 300,
			startedAt: Date.parse('2026-04-05T12:00:00.000Z')
		});

		const snapshot = buildActionSnapshot(state, '2026-04-10', '2026-04-10');

		expect(snapshot.enabledTrackerIds).not.toBe(state.enabledTrackerIds);
		expect(snapshot.trackers.steps).toMatchObject({ steps: 0, hasMeasurements: true });
		expect(snapshot.trackers['screen-time']).toMatchObject({
			minutes: 30,
			recorded: true,
			hasMeasurements: true
		});
		expect(snapshot.trackers.fitness).toMatchObject({
			scheduled: true,
			workoutId: 10,
			sets: 4,
			firstSetDurationSeconds: 130,
			additionalSetDurationSeconds: 240
		});
		expect(snapshot.trackers.nutrition.configured).toBe(false);
		expect(snapshot.trackers.meditation.daysSinceLastSession).toBe(5);
	});

	it('keeps missing Android measurements distinct from measured zero', () => {
		const state = createDefaultAppState(new Date('2026-04-10T12:00:00.000Z'));
		const snapshot = buildActionSnapshot(state, '2026-04-10', '2026-04-10');
		expect(snapshot.trackers.steps).toMatchObject({ steps: 0, hasMeasurements: false });
		expect(snapshot.trackers['screen-time']).toMatchObject({
			minutes: 0,
			recorded: false,
			hasMeasurements: false
		});
	});
});
