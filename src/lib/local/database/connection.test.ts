import { describe, expect, it, vi } from 'vitest';
import {
	openNativeDatabaseConnection,
	type NativeDatabaseConnection,
	type NativeSQLiteConnectionOwner
} from './connection';

describe('openNativeDatabaseConnection', () => {
	it('opens a newly created native connection', async () => {
		const connection = fakeConnection();
		const sqlite = fakeOwner(connection);

		await openNativeDatabaseConnection(sqlite);

		expect(sqlite.createConnection).toHaveBeenCalledOnce();
		expect(connection.open).toHaveBeenCalledOnce();
		expect(sqlite.closeConnection).not.toHaveBeenCalled();
	});

	it('closes a stale named connection and retries when it already exists', async () => {
		const connection = fakeConnection();
		const sqlite = fakeOwner(connection);
		sqlite.createConnection = vi
			.fn()
			.mockRejectedValueOnce(
				new Error('CreateConnection: Connection self-improvement-local-v2 already exists')
			)
			.mockResolvedValueOnce(connection);

		await openNativeDatabaseConnection(sqlite);

		expect(sqlite.closeConnection).toHaveBeenCalledExactlyOnceWith(
			'self-improvement-local-v2',
			false
		);
		expect(sqlite.createConnection).toHaveBeenCalledTimes(2);
		expect(connection.open).toHaveBeenCalledOnce();
	});

	it('accepts the plugin error as a string with trailing punctuation', async () => {
		const connection = fakeConnection();
		const sqlite = fakeOwner(connection);
		sqlite.createConnection = vi
			.fn()
			.mockRejectedValueOnce(
				'CreateConnection: Connection self-improvement-local-v2 already exists.'
			)
			.mockResolvedValueOnce(connection);

		await openNativeDatabaseConnection(sqlite);

		expect(sqlite.closeConnection).toHaveBeenCalledOnce();
		expect(sqlite.createConnection).toHaveBeenCalledTimes(2);
	});

	it('preserves creation errors other than the exact stale-connection error', async () => {
		const connection = fakeConnection();
		const sqlite = fakeOwner(connection);
		const error = new Error('CreateConnection: Connection another-database already exists.');
		sqlite.createConnection = vi.fn().mockRejectedValueOnce(error);

		await expect(openNativeDatabaseConnection(sqlite)).rejects.toBe(error);

		expect(sqlite.closeConnection).not.toHaveBeenCalled();
		expect(sqlite.createConnection).toHaveBeenCalledOnce();
		expect(connection.open).not.toHaveBeenCalled();
	});
});

function fakeOwner(
	connection: NativeDatabaseConnection & { open(): Promise<void> }
): NativeSQLiteConnectionOwner {
	return {
		closeConnection: vi.fn(async () => undefined),
		createConnection: vi.fn(async () => connection)
	};
}

function fakeConnection(): NativeDatabaseConnection & { open(): Promise<void> } {
	return {
		beginTransaction: async () => undefined,
		commitTransaction: async () => undefined,
		rollbackTransaction: async () => undefined,
		execute: async () => undefined,
		query: async () => ({ values: [] }),
		run: async () => undefined,
		delete: async () => undefined,
		open: vi.fn(async () => undefined)
	};
}
