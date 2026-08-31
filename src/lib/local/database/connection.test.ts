import { describe, expect, it, vi } from 'vitest';
import {
	openNativeDatabaseConnection,
	type NativeDatabaseConnection,
	type NativeSQLiteConnectionOwner
} from './connection';

describe('openNativeDatabaseConnection', () => {
	it('reconciles native state before opening a newly created connection', async () => {
		const events: string[] = [];
		const connection = fakeConnection(events);
		const sqlite = fakeOwner(connection, events);

		await openNativeDatabaseConnection(sqlite);

		expect(events).toEqual(['consistency', 'create', 'open']);
		expect(sqlite.checkConnectionsConsistency).toHaveBeenCalledOnce();
		expect(sqlite.createConnection).toHaveBeenCalledOnce();
		expect(connection.open).toHaveBeenCalledOnce();
	});

	it('relies on connection reconciliation instead of matching plugin error text', async () => {
		const connection = fakeConnection();
		const sqlite = fakeOwner(connection);
		sqlite.checkConnectionsConsistency = vi.fn(async () => ({ result: false }));

		await openNativeDatabaseConnection(sqlite);

		expect(sqlite.checkConnectionsConsistency).toHaveBeenCalledOnce();
		expect(sqlite.createConnection).toHaveBeenCalledOnce();
		expect(sqlite.closeConnection).not.toHaveBeenCalled();
	});

	it('preserves connection-consistency failures', async () => {
		const connection = fakeConnection();
		const sqlite = fakeOwner(connection);
		const error = new Error('SQLite connection reconciliation failed.');
		sqlite.checkConnectionsConsistency = vi.fn().mockRejectedValueOnce(error);

		await expect(openNativeDatabaseConnection(sqlite)).rejects.toBe(error);

		expect(sqlite.createConnection).not.toHaveBeenCalled();
		expect(connection.open).not.toHaveBeenCalled();
	});

	it('preserves connection creation failures', async () => {
		const connection = fakeConnection();
		const sqlite = fakeOwner(connection);
		const error = new Error('SQLite connection creation failed.');
		sqlite.createConnection = vi.fn().mockRejectedValueOnce(error);

		await expect(openNativeDatabaseConnection(sqlite)).rejects.toBe(error);

		expect(sqlite.checkConnectionsConsistency).toHaveBeenCalledOnce();
		expect(connection.open).not.toHaveBeenCalled();
	});
});

function fakeOwner(
	connection: NativeDatabaseConnection & { open(): Promise<void> },
	events: string[] = []
): NativeSQLiteConnectionOwner {
	return {
		closeConnection: vi.fn(async () => undefined),
		checkConnectionsConsistency: vi.fn(async () => {
			events.push('consistency');
			return { result: true };
		}),
		createConnection: vi.fn(async () => {
			events.push('create');
			return connection;
		})
	};
}

function fakeConnection(
	events: string[] = []
): NativeDatabaseConnection & { open(): Promise<void> } {
	return {
		beginTransaction: async () => undefined,
		commitTransaction: async () => undefined,
		rollbackTransaction: async () => undefined,
		execute: async () => undefined,
		query: async () => ({ values: [] }),
		run: async () => undefined,
		delete: async () => undefined,
		open: vi.fn(async () => {
			events.push('open');
		})
	};
}
