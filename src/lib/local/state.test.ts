import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyStatus } from '$domain/status';
import {
	createDefaultAppState,
	LOCAL_STATE_VERSION,
	LocalAppDatabase,
	LocalAppStore,
	createNativeAppStateConnectionAdapter,
	type NativeAppStateConnection,
	validateLocalAppState
} from './state';
import { DEXIE_STORES } from './database/schema';
import { DEFAULT_STRETCH_DIFFICULTIES } from './tracker-settings';

const stores: LocalAppStore[] = [];

afterEach(async () => {
	await Promise.all(stores.splice(0).map((store) => store.deleteDatabase()));
});

describe('relational local app state', () => {
	it('starts with v2 export defaults and empty tracker tables', () => {
		const state = createDefaultAppState(new Date('2026-03-20T12:00:00.000Z'));

		expect(state.version).toBe(LOCAL_STATE_VERSION);
		expect(state.user).toEqual({
			id: 'local-profile',
			name: 'You',
			createdAt: '2026-03-20T12:00:00.000Z'
		});
		expect(state.enabledTrackerIds).toHaveLength(11);
		expect(state.stretch.difficulties).toEqual(DEFAULT_STRETCH_DIFFICULTIES);
		expect(state.steps.days).toEqual([]);
		expect(state.nutrition.entries).toEqual([]);
		expect(state.chores.sessions).toEqual([]);
	});

	it('rejects the removed v1 aggregate format', () => {
		const state = createDefaultAppState();
		expect(() => validateLocalAppState({ ...state, version: 1 })).toThrow();
	});

	it('migrates v2 browser data and enables Chores', async () => {
		const name = databaseName();
		const legacy = new Dexie(name);
		const { choresSessions: _choresSessions, ...versionTwoStores } = DEXIE_STORES;
		legacy.version(2).stores(versionTwoStores);
		await legacy.table('profile').put({
			id: 1,
			name: 'Existing user',
			createdAt: '2026-03-20T12:00:00.000Z'
		});
		await legacy.table('enabledTrackers').put({ trackerId: 'steps', position: 0 });
		legacy.close();
		const store = trackedStore(name);

		const state = await store.readDomains(['profile', 'chores']);

		expect(state.user.name).toBe('Existing user');
		expect(state.enabledTrackerIds).toEqual(['steps', 'chores']);
		expect(state.chores.sessions).toEqual([]);
	});

	it('persists concurrent mutations in normalized Dexie tables', async () => {
		const name = databaseName();
		const first = trackedStore(name);
		await Promise.all([
			first.updateDomains(['steps'], async (state) => {
				await Promise.resolve();
				state.steps.dailyGoal += 1_000;
			}),
			first.updateDomains(['steps'], (state) => {
				state.steps.dailyGoal += 2_000;
			})
		]);
		const second = trackedStore(name);

		expect((await second.readDomains(['steps'])).steps.dailyGoal).toBe(8_000);
		expect(await new LocalAppDatabase(name).stepsSettings.get(1)).toEqual({
			id: 1,
			dailyGoal: 8_000,
			lastReceivedAt: null
		});
	});

	it('stores nutrition image bytes as a Blob outside entry and meal rows', async () => {
		const name = databaseName();
		const database = new LocalAppDatabase(name);
		const store = new LocalAppStore(database, null);
		stores.push(store);
		const state = createDefaultAppState();
		state.nutrition.entries.push({
			id: 'entry',
			date: '2026-03-20',
			name: 'Lunch',
			notes: '',
			createdAt: '2026-03-20T12:00:00.000Z',
			thumbnail: '',
			totals: { calories: 1, proteinG: 0, carbsG: 0, fatG: 0, count: 1 },
			meals: [
				{
					id: 'meal',
					name: 'Lunch',
					imageDataUrl: 'data:image/jpeg;base64,YQ==',
					totals: { calories: 1, proteinG: 0, carbsG: 0, fatG: 0, count: 1 },
					ingredients: [
						{
							id: 'ingredient',
							name: 'Rice',
							quantity: 1,
							unit: 'serving',
							calories: 1,
							proteinG: 0,
							carbsG: 0,
							fatG: 0,
							notes: ''
						}
					]
				}
			]
		});

		await store.replaceState(state);

		expect((await database.nutritionMedia.get('meal-meal'))?.blob).toBeInstanceOf(Blob);
		expect(await database.nutritionEntries.get('entry')).not.toHaveProperty('document');
		expect(
			(await store.readDomains(['nutrition'])).nutrition.entries[0].meals[0].imageDataUrl
		).toBe('data:image/jpeg;base64,YQ==');
	});

	it('preserves unresolved stored media during edits and refuses to export it', async () => {
		const name = databaseName();
		const database = new LocalAppDatabase(name);
		const store = new LocalAppStore(database, null);
		stores.push(store);
		const state = nutritionState('data:image/jpeg;base64,aGVsbG8=');
		await store.replaceState(state);
		const original = await database.nutritionMedia.get('meal-meal');
		await database.nutritionMedia.update('meal-meal', { blob: undefined });

		await store.updateDomains(['nutrition'], (draft) => {
			draft.nutrition.entries[0].notes = 'Metadata only';
		});

		const retained = await database.nutritionMedia.get('meal-meal');
		expect(retained).toMatchObject({
			relativePath: original?.relativePath,
			byteSize: 5
		});
		await expect(store.exportState()).rejects.toThrow('nutrition photo could not be read');
	});

	it('rejects malformed nutrition image values instead of storing empty files', async () => {
		const store = trackedStore(databaseName());
		await expect(store.replaceState(nutritionState('not-an-image'))).rejects.toThrow(
			'Nutrition images must be valid'
		);
	});

	it('queues reads and exports behind an in-flight mutation', async () => {
		const store = trackedStore(databaseName());
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		const update = store.updateDomains(['steps'], async (state) => {
			await gate;
			state.steps.dailyGoal = 9_000;
		});
		const read = store.readDomains(['steps']);
		const exported = store.exportState();
		release();

		await update;
		expect((await read).steps.dailyGoal).toBe(9_000);
		expect((await exported).steps.dailyGoal).toBe(9_000);
	});

	it('stores native synchronization status in the database', async () => {
		const store = trackedStore(databaseName());
		const status = createEmptyStatus();
		status.trackers.steps = {
			permission: 'granted',
			outcome: 'success',
			lastSuccessAt: '2026-03-20T12:00:00.000Z'
		};

		await store.saveSyncStatus(status);

		expect(await store.loadSyncStatus()).toEqual(status);
	});

	it('validates before transactionally replacing all relational data', async () => {
		const store = trackedStore(databaseName());
		const backup = await store.exportState();
		backup.user.name = 'Local backup';
		await store.replaceState(backup);

		expect((await store.readDomains(['profile'])).user.name).toBe('Local backup');
		expect(() => store.replaceState({ ...backup, version: 1 })).toThrow();
		expect((await store.readDomains(['profile'])).user.name).toBe('Local backup');
	});
});

describe('native relational SQLite state', () => {
	it('initializes v3 normalized tables without a legacy document table', async () => {
		const native = new FakeNativeConnection();
		const store = nativeStore(native);

		const state = await store.readDomains(['profile', 'steps']);

		expect(state.user.name).toBe('You');
		expect(native.schemaVersion).toBe(3);
		expect(native.events.join('\n')).not.toContain('document TEXT');
		expect(native.events).toContain('execute:false:schema');
		expect(native.events.join('\n')).not.toContain('PRAGMA journal_mode');
		expect(native.events.join('\n')).not.toContain('PRAGMA foreign_keys');
		expect(native.tableNames()).toContain('profile');
		expect(native.tableNames()).toContain('step_days');
	});

	it('updates only selected domain tables and rolls back failed writes', async () => {
		const native = new FakeNativeConnection();
		const store = nativeStore(native);
		await store.readDomains(['profile']);
		native.events = [];

		await store.updateDomains(['profile'], (state) => {
			state.user.name = 'SQLite profile';
		});

		expect((await store.readDomains(['profile'])).user.name).toBe('SQLite profile');
		expect(native.events.some((event) => event.includes('step_days'))).toBe(false);
		native.failNextWrite = true;
		await expect(
			store.updateDomains(['profile'], (state) => {
				state.user.name = 'Failed';
			})
		).rejects.toThrow('write failed');
		expect((await store.readDomains(['profile'])).user.name).toBe('SQLite profile');
	});

	it('deletes and unregisters the v2 production connection', async () => {
		const connection = new FakeNativeConnection();
		const owner = {
			closeConnection: async (database: string, readonly: boolean) => {
				connection.events.push(`close:${database}:${readonly}`);
			}
		};
		const adapter = createNativeAppStateConnectionAdapter(owner, connection);

		await adapter.delete();

		expect(connection.events).toEqual(['delete', 'close:self-improvement-local-v2:false']);
	});

	it('rejects unsupported SQLite schemas', async () => {
		const store = nativeStore(new FakeNativeConnection(4));
		await expect(store.read()).rejects.toThrow('Unsupported SQLite schema version: 4');
	});
});

class FakeNativeConnection implements NativeAppStateConnection {
	events: string[] = [];
	failNextWrite = false;
	private tables = new Map<string, Array<Record<string, unknown>>>();
	private snapshot: Map<string, Array<Record<string, unknown>>> | undefined;
	private transactionActive = false;

	constructor(public schemaVersion = 0) {}

	async beginTransaction() {
		if (this.transactionActive) throw new Error('nested transaction');
		this.events.push('begin');
		this.snapshot = structuredClone(this.tables);
		this.transactionActive = true;
	}

	async commitTransaction() {
		this.events.push('commit');
		this.snapshot = undefined;
		this.transactionActive = false;
	}

	async rollbackTransaction() {
		this.events.push('rollback');
		if (this.snapshot) this.tables = this.snapshot;
		this.snapshot = undefined;
		this.transactionActive = false;
	}

	async execute(statement: string, transaction = true) {
		this.rejectNestedTransaction(transaction);
		this.events.push(`execute:${transaction}:${statement.startsWith('\n') ? 'schema' : statement}`);
		if (statement.includes('PRAGMA user_version = 3')) this.schemaVersion = 3;
	}

	async query(statement: string) {
		this.events.push(`query:${statement}`);
		if (statement === 'PRAGMA user_version;')
			return { values: [{ user_version: this.schemaVersion }] };
		if (statement === 'SELECT id FROM profile WHERE id = 1;') {
			return { values: this.rows('profile').filter(({ id }) => id === 1) };
		}
		const table = /from\s+"([^"]+)"/i.exec(statement)?.[1];
		return { values: table ? structuredClone(this.rows(table)) : [] };
	}

	async run(statement: string, values: unknown[] = [], transaction = true) {
		this.rejectNestedTransaction(transaction);
		this.events.push(`run:${transaction}:${statement}`);
		if (this.failNextWrite) {
			this.failNextWrite = false;
			throw new Error('write failed');
		}
		if (statement.startsWith('INSERT')) this.insert(statement, values);
		if (statement.startsWith('DELETE')) this.remove(statement, values);
	}

	async delete() {
		this.events.push('delete');
		this.tables.clear();
	}

	tableNames() {
		return [...this.tables.keys()];
	}

	private rows(table: string) {
		const rows = this.tables.get(table) ?? [];
		this.tables.set(table, rows);
		return rows;
	}

	private insert(statement: string, values: unknown[]) {
		const table = matchedPart(statement, /INSERT INTO "([^"]+)"/);
		const columns = quotedValues(matchedPart(statement, /\(([^)]+)\) VALUES/));
		const keys = quotedValues(matchedPart(statement, /ON CONFLICT \(([^)]+)\)/));
		const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
		const rows = this.rows(table);
		const existing = rows.findIndex((item) => keys.every((key) => item[key] === row[key]));
		if (existing === -1) rows.push(row);
		else rows[existing] = row;
	}

	private remove(statement: string, values: unknown[]) {
		const table = matchedPart(statement, /DELETE FROM "([^"]+)"/);
		const keys = [...statement.matchAll(/"([^"]+)" = \?/g)].map((match) => match[1]);
		this.tables.set(
			table,
			this.rows(table).filter((row) => !keys.every((key, index) => row[key] === values[index]))
		);
	}

	private rejectNestedTransaction(transaction: boolean) {
		if (transaction && this.transactionActive) throw new Error('nested transaction');
	}
}

function matchedPart(value: string, pattern: RegExp) {
	const match = pattern.exec(value)?.[1];
	if (!match) throw new Error(`Unexpected SQL: ${value}`);
	return match;
}

function quotedValues(value: string) {
	return [...value.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function nativeStore(native: NativeAppStateConnection) {
	return new LocalAppStore(new LocalAppDatabase(databaseName()), async () => native);
}

function trackedStore(name: string) {
	const store = new LocalAppStore(new LocalAppDatabase(name), null);
	stores.push(store);
	return store;
}

function databaseName() {
	return `local-state-test-${crypto.randomUUID()}`;
}

function nutritionState(imageDataUrl: string) {
	const state = createDefaultAppState(new Date('2026-09-05T12:00:00.000Z'));
	const totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 };
	state.nutrition.entries.push({
		id: 'entry',
		date: '2026-09-05',
		name: 'Meal',
		notes: '',
		createdAt: state.updatedAt,
		thumbnail: '',
		totals,
		meals: [{ id: 'meal', name: 'Meal', imageDataUrl, ingredients: [], totals }]
	});
	return state;
}
