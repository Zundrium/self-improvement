import type {
	NativeDatabaseConnection,
	NativeSQLiteConnectionOwner
} from '$lib/local/database/connection';

export async function openNativeSQLiteDatabase(database: string, version: number) {
	const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
	const sqlite: NativeSQLiteConnectionOwner = new SQLiteConnection(CapacitorSQLite);
	await sqlite.checkConnectionsConsistency?.();
	if (!sqlite.createConnection)
		throw new Error('Native SQLite connection creation is unavailable.');
	const connection = (await sqlite.createConnection(
		database,
		false,
		'no-encryption',
		version,
		false
	)) as NativeDatabaseConnection & { open(): Promise<void> };
	try {
		await connection.open();
	} catch (error) {
		try {
			await sqlite.closeConnection(database, false);
		} catch {}
		throw error;
	}
	return { sqlite, connection };
}
