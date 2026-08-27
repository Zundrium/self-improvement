import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
	LOCAL_STATE_VERSION,
	LocalAppDatabase,
	LocalAppStore,
	createDefaultAppState
} from './state';

const stores: LocalAppStore[] = [];

afterEach(async () => {
	await Promise.all(stores.splice(0).map((store) => store.deleteDatabase()));
});

describe('local app state', () => {
	it('starts with one local profile, every default tracker, and empty tracker data', () => {
		const state = createDefaultAppState(new Date('2026-03-20T12:00:00.000Z'));

		expect(state.version).toBe(LOCAL_STATE_VERSION);
		expect(state.user).toEqual({
			id: 'local-profile',
			name: 'You',
			createdAt: '2026-03-20T12:00:00.000Z'
		});
		expect(state.enabledTrackerIds).toEqual([
			'steps',
			'sleep',
			'screen-time',
			'fitness',
			'nutrition',
			'meditation',
			'breathing',
			'stretch',
			'happiness',
			'period'
		]);
		expect(state.steps.days).toEqual([]);
		expect(state.screenTime.dailyLimitMinutes).toBe(240);
		expect(state.fitness.defaultSets).toBe(2);
		expect(state.meditation.defaultDurationSeconds).toBe(300);
		expect(state.breathing).toMatchObject({ rounds: 6, includeHold: true });
		expect(state.stretch).toEqual({ holdSeconds: 30, sessions: [] });
		expect(state.happiness.defaultRating).toBe(3);
		expect(state.period).toMatchObject({ defaultFlow: 'medium', fallbackCycleDays: 28 });
		expect(state.nutrition.entries).toEqual([]);
		expect(state.gamification.awards).toEqual([]);
	});

	it('serializes mutations and persists the document across store instances', async () => {
		const name = databaseName();
		const first = trackedStore(name);
		await Promise.all([
			first.update(async (state) => {
				await Promise.resolve();
				state.steps.dailyGoal += 1_000;
			}),
			first.update((state) => {
				state.steps.dailyGoal += 2_000;
			})
		]);
		const second = trackedStore(name);

		expect((await second.read()).steps.dailyGoal).toBe(8_000);
	});

	it('validates a backup before atomically replacing current state', async () => {
		const store = trackedStore(databaseName());
		const backup = await store.exportState();
		backup.user.name = 'Local backup';
		await store.replaceState(backup);

		expect((await store.read()).user.name).toBe('Local backup');
		expect(() => store.replaceState({ ...backup, version: 99 })).toThrow();
		expect((await store.read()).user.name).toBe('Local backup');
	});
});

function trackedStore(name: string) {
	const store = new LocalAppStore(new LocalAppDatabase(name));
	stores.push(store);
	return store;
}

function databaseName() {
	return `local-state-test-${crypto.randomUUID()}`;
}
