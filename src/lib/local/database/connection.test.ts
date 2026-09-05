import { describe, expect, it, vi } from 'vitest';
import {
	NativeRelationalConnection,
	openNativeDatabaseConnection,
	type NativeDatabaseConnection,
	type NativeSQLiteConnectionOwner
} from './connection';

describe('openNativeDatabaseConnection', () => {
	it('retries a connection factory after a transient rejection', async () => {
		const connection = fakeConnection();
		const factory = vi
			.fn()
			.mockRejectedValueOnce(new Error('Transient open failure'))
			.mockResolvedValueOnce(connection);
		const relational = new NativeRelationalConnection(factory);

		await expect(relational.read(['profile'])).rejects.toThrow('Transient open failure');
		await expect(relational.read(['profile'])).resolves.toEqual({ profile: [] });
		expect(factory).toHaveBeenCalledTimes(2);
	});

	it('uses bounded native predicates for task-specific row reads', async () => {
		const connection = fakeConnection();
		connection.query = vi.fn(async () => ({ values: [] }));
		const relational = new NativeRelationalConnection(async () => connection);

		await relational.readRows('nutritionFastingDates', {
			equals: { key: 'localDate', value: '2026-09-05' }
		});

		expect(connection.query).toHaveBeenCalledWith(
			'SELECT * FROM "nutrition_fasting_dates" WHERE "local_date" = ?;',
			['2026-09-05']
		);
	});

	it('holds a shared native snapshot across dependent reads while another instance waits to write', async () => {
		const events: string[] = [];
		const connection = fakeConnection(events);
		connection.beginTransaction = vi.fn(async () => {
			events.push('begin');
		});
		connection.commitTransaction = vi.fn(async () => {
			events.push('commit');
		});
		connection.query = vi.fn(async (sql) => {
			events.push(`query:${sql}`);
			return { values: [] };
		});
		const first = new NativeRelationalConnection(async () => connection);
		const second = new NativeRelationalConnection(async () => connection);
		let release!: () => void;
		const gate = new Promise<void>((resolve) => (release = resolve));
		const snapshot = first.readSnapshot(['nutritionEntries', 'nutritionMeals'], async (read) => {
			await read('nutritionEntries', { equals: { key: 'localDate', value: '2026-09-05' } });
			await gate;
			return read('nutritionMeals', { equals: { key: 'entryId', value: 'entry' } });
		});
		const write = second.write({ profile: [] });
		release();
		await Promise.all([snapshot, write]);

		const snapshotCommit = events.indexOf('commit');
		const writeRead = events.findIndex((event) => event.includes('from "profile"'));
		expect(snapshotCommit).toBeGreaterThan(-1);
		expect(writeRead).toBeGreaterThan(snapshotCommit);
	});

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

	it('closes a partially created connection after open fails', async () => {
		const connection = fakeConnection();
		const sqlite = fakeOwner(connection);
		connection.open = vi.fn().mockRejectedValueOnce(new Error('open failed'));

		await expect(openNativeDatabaseConnection(sqlite)).rejects.toThrow('open failed');

		expect(sqlite.closeConnection).toHaveBeenCalledWith('self-improvement-local-v2', false);
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
