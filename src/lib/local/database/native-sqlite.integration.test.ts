import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalAppService } from '../service';
import { LocalAppDatabase, LocalAppStore, type NativeAppStateConnection } from '../state';

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
		expect(sqlite.prepare('PRAGMA user_version;').get()).toEqual({ user_version: 2 });
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
