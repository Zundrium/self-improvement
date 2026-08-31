import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createDefaultAppState,
	LOCAL_STATE_VERSION,
	LocalAppDatabase,
	LocalAppStore,
	createNativeAppStateConnectionAdapter,
	type NativeAppStateConnection,
	validateLocalAppState
} from './state';
import { DEFAULT_STRETCH_DIFFICULTIES } from './tracker-settings';

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
		expect(state.stretch).toEqual({
			holdSeconds: 30,
			difficulties: DEFAULT_STRETCH_DIFFICULTIES,
			sessions: []
		});
		expect(state.happiness.defaultRating).toBe(3);
		expect(state.period).toMatchObject({ defaultFlow: 'medium', fallbackCycleDays: 28 });
		expect(state.nutrition.entries).toEqual([]);
		expect(state.gamification.awards).toEqual([]);
		expect(state.gamification.achievementUnlocks).toEqual([]);
	});

	it('adds achievement unlock storage when parsing an older v1 state', () => {
		const state = createDefaultAppState(new Date('2026-03-20T12:00:00.000Z'));
		const { achievementUnlocks: _achievementUnlocks, ...legacyGamification } = state.gamification;

		const migrated = validateLocalAppState({ ...state, gamification: legacyGamification });

		expect(migrated.gamification.achievementUnlocks).toEqual([]);
	});

	it('accepts legacy completion records while preserving new achievement evidence', () => {
		const legacy = createDefaultAppState(new Date('2026-03-20T12:00:00.000Z'));
		legacy.fitness.completedDays.push({ workoutId: 20, dateKey: '2026-03-20' });
		legacy.stretch.sessions.push({
			id: 'legacy-stretch',
			localDate: '2026-03-20',
			holdSeconds: 30,
			completedAt: '2026-03-20T12:00:00.000Z'
		});

		const migrated = validateLocalAppState(legacy);
		expect(migrated.fitness.completedDays[0].completedAt).toBeUndefined();
		expect(migrated.stretch.sessions[0].hardVariationCompleted).toBeUndefined();

		legacy.fitness.completedDays[0].completedAt = '2026-03-20T12:00:00.000Z';
		legacy.stretch.sessions[0].hardVariationCompleted = true;
		const current = validateLocalAppState(legacy);
		expect(current.fitness.completedDays[0].completedAt).toBe('2026-03-20T12:00:00.000Z');
		expect(current.stretch.sessions[0].hardVariationCompleted).toBe(true);
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

	it('deletes browser Dexie state without reopening the database', async () => {
		const database = new LocalAppDatabase(databaseName());
		const store = new LocalAppStore(database);
		await store.update((state) => {
			state.user.name = 'Browser profile';
		});

		await store.deleteDatabase();

		expect(database.isOpen()).toBe(false);
	});
});

describe('native local app state', () => {
	it('initializes the schema and creates a default document', async () => {
		const native = new FakeNativeConnection();
		const store = nativeStore(native);

		const state = await store.read();

		expect(state.user.name).toBe('You');
		expect(native.schemaVersion).toBe(1);
		expect(native.document).toBeDefined();
		expect(native.events).toEqual([
			'begin',
			'query:PRAGMA user_version;',
			'execute:false:CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY NOT NULL, document TEXT NOT NULL);',
			'execute:false:PRAGMA user_version = 1;',
			'query:SELECT id FROM app_state WHERE id = ?;',
			'run:false:INSERT INTO app_state (id, document) VALUES (?, ?);',
			'commit'
		]);
	});

	it('retries failed default initialization without retaining partial state', async () => {
		const native = new FakeNativeConnection();
		native.failNextWrite = true;
		const store = nativeStore(native);

		await expect(store.read()).rejects.toThrow('write failed');
		expect(native.schemaVersion).toBe(0);
		expect(native.document).toBeUndefined();

		await expect(store.read()).resolves.toMatchObject({ user: { name: 'You' } });
	});

	it('uses and persists an existing SQLite document without reading Dexie', async () => {
		const database = new LocalAppDatabase(databaseName());
		const sqliteState = createDefaultAppState();
		sqliteState.user.name = 'SQLite profile';
		const dexieRead = vi
			.spyOn(database.appState, 'get')
			.mockRejectedValue(new Error('Native state accessed Dexie.'));
		const native = new FakeNativeConnection(1, sqliteState);
		const store = new LocalAppStore(database, async () => native);

		expect((await store.read()).user.name).toBe('SQLite profile');
		await store.update((state) => {
			state.user.name = 'Updated SQLite profile';
		});

		const secondStore = new LocalAppStore(database, async () => native);
		expect((await secondStore.read()).user.name).toBe('Updated SQLite profile');
		expect(dexieRead).not.toHaveBeenCalled();
		expect(native.events).not.toContain('run:false:INSERT INTO app_state (id, document) VALUES (?, ?);');
		await database.delete();
	});

	it('rolls back a failed native write and preserves the prior document', async () => {
		const native = new FakeNativeConnection(1, createDefaultAppState());
		const store = nativeStore(native);
		await store.read();
		native.events = [];
		native.failNextWrite = true;

		await expect(
			store.update((state) => {
				state.user.name = 'Changed';
			})
		).rejects.toThrow('write failed');

		expect(JSON.parse(native.document ?? '{}').user.name).toBe('You');
		expect(native.events).toEqual([
			'begin',
			'run:false:UPDATE app_state SET document = ? WHERE id = ?;',
			'rollback'
		]);
		native.events = [];

		expect((await store.read()).user.name).toBe('You');
		expect(native.events).toEqual(['query:SELECT document FROM app_state WHERE id = ?;']);
	});

	it('serves native reads and updates from the initialized state cache', async () => {
		const native = new FakeNativeConnection(1, createDefaultAppState());
		const store = nativeStore(native);

		await store.read();
		native.events = [];
		await store.read();
		await store.update((state) => {
			state.user.name = 'Cached profile';
		});
		await store.read();

		expect(native.events).not.toContain('query:SELECT document FROM app_state WHERE id = ?;');
		expect(native.events).toEqual([
			'begin',
			'run:false:UPDATE app_state SET document = ? WHERE id = ?;',
			'commit'
		]);
	});

	it('skips native persistence when a mutation leaves cached state unchanged', async () => {
		const native = new FakeNativeConnection(1, createDefaultAppState());
		const store = nativeStore(native);
		const before = await store.read();
		native.events = [];

		const after = await store.update(() => {});

		expect(after).toEqual(before);
		expect(native.events).toEqual([]);
	});

	it('serializes native writes in call order', async () => {
		const native = new FakeNativeConnection(1, createDefaultAppState());
		const store = nativeStore(native);

		await Promise.all([
			store.update(async (state) => {
				await Promise.resolve();
				state.steps.dailyGoal += 1_000;
			}),
			store.update((state) => {
				state.steps.dailyGoal += 2_000;
			})
		]);

		expect(JSON.parse(native.document ?? '{}').steps.dailyGoal).toBe(8_000);
		const writes = native.events.filter((event) => event.startsWith('run:false:UPDATE'));
		expect(writes).toHaveLength(2);
	});

	it('replaces the native cache only after persisting a backup-compatible document', async () => {
		const native = new FakeNativeConnection(1, createDefaultAppState());
		const store = nativeStore(native);
		const backup = await store.exportState();
		backup.user.name = 'Native backup';
		native.events = [];

		await store.replaceState(backup);

		expect((await store.exportState()).user.name).toBe('Native backup');
		expect(native.events).toEqual([
			'begin',
			'run:false:UPDATE app_state SET document = ? WHERE id = ?;',
			'commit'
		]);
	});

	it('deletes only native state before recreating the connection', async () => {
		const database = new LocalAppDatabase(databaseName());
		const legacy = createDefaultAppState();
		legacy.user.name = 'Dexie profile';
		await database.appState.put({ id: 'current', document: legacy });
		const connections: FakeNativeConnection[] = [];
		const store = new LocalAppStore(database, async () => {
			const connection = new FakeNativeConnection();
			connections.push(connection);
			return connection;
		});

		expect((await store.read()).user.name).toBe('You');
		await store.deleteDatabase();

		expect(connections[0].events).toContain('delete');
		expect((await database.appState.get('current'))?.document.user.name).toBe('Dexie profile');
		expect((await store.read()).user.name).toBe('You');
		expect(connections).toHaveLength(2);
		await database.delete();
	});

	it('deletes the database and unregisters the production connection adapter', async () => {
		const connection = new FakeNativeConnection();
		const owner = { closeConnection: async (database: string, readonly: boolean) => {
			connection.events.push(`close:${database}:${readonly}`);
		} };
		const adapter = createNativeAppStateConnectionAdapter(owner, connection);

		await adapter.delete();

		expect(connection.events).toEqual(['delete', 'close:self-improvement-local:false']);
	});

	it('rejects unsupported future SQLite schemas', async () => {
		const store = nativeStore(new FakeNativeConnection(2));

		await expect(store.read()).rejects.toThrow('Unsupported SQLite schema version: 2');
	});
});

class FakeNativeConnection implements NativeAppStateConnection {
	events: string[] = [];
	failNextWrite = false;
	private snapshot: { document: string | undefined; schemaVersion: number } | undefined;
	document: string | undefined;

	constructor(public schemaVersion = 0, state?: ReturnType<typeof createDefaultAppState>) {
		this.document = state && JSON.stringify(state);
	}

	private transactionActive = false;

	async beginTransaction() {
		if (this.transactionActive) throw new Error('nested transaction');
		this.events.push('begin');
		this.snapshot = { document: this.document, schemaVersion: this.schemaVersion };
		this.transactionActive = true;
	}

	async commitTransaction() {
		this.events.push('commit');
		this.snapshot = undefined;
		this.transactionActive = false;
	}

	async rollbackTransaction() {
		this.events.push('rollback');
		if (this.snapshot) {
			this.document = this.snapshot.document;
			this.schemaVersion = this.snapshot.schemaVersion;
		}
		this.snapshot = undefined;
		this.transactionActive = false;
	}

	async execute(statement: string, transaction = true) {
		this.rejectNestedTransaction(transaction);
		this.events.push(`execute:${transaction}:${statement}`);
		if (statement.startsWith('PRAGMA user_version')) this.schemaVersion = 1;
	}

	async query(statement: string) {
		this.events.push(`query:${statement}`);
		if (statement.startsWith('PRAGMA')) return { values: [{ user_version: this.schemaVersion }] };
		if (statement.startsWith('SELECT id')) return { values: this.document ? [{ id: 'current' }] : [] };
		return { values: this.document ? [{ document: this.document }] : [] };
	}

	async run(statement: string, values?: unknown[], transaction = true) {
		this.rejectNestedTransaction(transaction);
		this.events.push(`run:${transaction}:${statement}`);
		if (this.failNextWrite) {
			this.failNextWrite = false;
			throw new Error('write failed');
		}
		this.document = String(values?.[statement.startsWith('INSERT') ? 1 : 0]);
	}

	async delete() {
		this.events.push('delete');
		this.document = undefined;
	}

	private rejectNestedTransaction(transaction: boolean) {
		if (this.transactionActive && transaction) throw new Error('nested transaction');
	}
}

function nativeStore(native: NativeAppStateConnection) {
	return new LocalAppStore(new LocalAppDatabase(databaseName()), async () => native);
}

function trackedStore(name: string) {
	const store = new LocalAppStore(new LocalAppDatabase(name));
	stores.push(store);
	return store;
}

function databaseName() {
	return `local-state-test-${crypto.randomUUID()}`;
}
