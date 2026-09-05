import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalAppService } from '../service';
import { LocalAppDatabase, LocalAppStore, type NativeAppStateConnection } from '../state';
import { readFileSync } from 'node:fs';

const databases: LocalAppDatabase[] = [];

describe('native SQLite integration', () => {
	afterEach(() => {
		for (const database of databases) database.close();
		databases.length = 0;
	});

	it('initializes and reads the default relational state', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const database = new LocalAppDatabase(`native-integration-${crypto.randomUUID()}`);
		databases.push(database);
		const store = new LocalAppStore(database, async () => nativeConnection(sqlite));

		const state = await store.read();
		const bootstrap = await new LocalAppService(store).request<{ profile: { name: string } }>(
			'/api/app/bootstrap'
		);

		expect(state.user.name).toBe('You');
		expect(bootstrap.profile.name).toBe('You');
		expect(sqlite.prepare('PRAGMA user_version;').get()).toEqual({ user_version: 3 });
		sqlite.close();
	});

	it('migrates v2 databases and enables Chores without losing profile data', async () => {
		const sqlite = new DatabaseSync(':memory:');
		sqlite.exec(readFileSync(new URL('./fixtures/sqlite-v2.sql', import.meta.url), 'utf8'));
		sqlite.exec(`
			INSERT INTO profile (id, name, created_at)
			VALUES (1, 'Existing user', '2026-03-20T12:00:00.000Z');
			INSERT INTO enabled_trackers (tracker_id, position) VALUES ('steps', 0);
		`);
		const database = new LocalAppDatabase(`native-migration-${crypto.randomUUID()}`);
		databases.push(database);
		const store = new LocalAppStore(database, async () => nativeConnection(sqlite));

		const state = await store.readDomains(['profile', 'chores']);

		expect(state.user.name).toBe('Existing user');
		expect(state.enabledTrackerIds).toEqual(['steps', 'chores']);
		expect(state.chores.sessions).toEqual([]);
		expect(sqlite.prepare('PRAGMA user_version;').get()).toEqual({ user_version: 3 });
		sqlite.close();
	});
});

function nativeConnection(database: DatabaseSync): NativeAppStateConnection {
	return {
		beginTransaction: async () => database.exec('BEGIN;'),
		commitTransaction: async () => database.exec('COMMIT;'),
		rollbackTransaction: async () => database.exec('ROLLBACK;'),
		execute: async (statements) => database.exec(statements),
		query: async (statement, values = []) => ({
			values: database.prepare(statement).all(...sqliteValues(values)) as Array<
				Record<string, unknown>
			>
		}),
		run: async (statement, values = []) => database.prepare(statement).run(...sqliteValues(values)),
		delete: async () => undefined
	};
}

function sqliteValues(values: unknown[]) {
	return values as SQLInputValue[];
}
