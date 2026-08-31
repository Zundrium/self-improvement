import { Capacitor } from '@capacitor/core';
import Dexie, { type EntityTable, type Table } from 'dexie';
import { getTableName } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import type { MobileSyncStatus } from '$domain/model';
import { createEmptyStatus, parseStoredStatus } from '$domain/status';
import {
	BOOLEAN_COLUMNS,
	BROWSER_DATABASE_NAME,
	DEXIE_STORES,
	LEGACY_BROWSER_DATABASE_NAME,
	LEGACY_SQLITE_DATABASE_NAME,
	SQLITE_DATABASE_NAME,
	SQLITE_SCHEMA_SQL,
	SQLITE_SCHEMA_VERSION,
	TABLE_COLUMNS,
	TABLE_KEYS,
	TABLE_ORDER,
	sqliteTables,
	type RelationalData,
	type RelationalRows,
	type TableName
} from './schema';

export type NativeQueryResult = { values?: Array<Record<string, unknown>> };
export type NativeDatabaseConnection = {
	beginTransaction(): Promise<unknown>;
	commitTransaction(): Promise<unknown>;
	rollbackTransaction(): Promise<unknown>;
	execute(statements: string, transaction?: boolean): Promise<unknown>;
	query(statement: string, values?: unknown[]): Promise<NativeQueryResult>;
	run(statement: string, values?: unknown[], transaction?: boolean): Promise<unknown>;
	delete(): Promise<void>;
	cleanupLegacyDatabase?(): Promise<void>;
};
export type NativeDatabaseConnectionFactory = () => Promise<NativeDatabaseConnection>;

export interface RelationalConnection {
	initialize(defaults: RelationalData): Promise<void>;
	read<T extends TableName>(
		tables: readonly T[],
		options?: { loadMedia?: boolean }
	): Promise<Pick<RelationalData, T>>;
	write(data: Partial<RelationalData>): Promise<void>;
	deleteDatabase(): Promise<void>;
}

type TypedTables = {
	[K in TableName]: EntityTable<RelationalRows[K], keyof RelationalRows[K] & string>;
};

export class LocalAppDatabase extends Dexie {
	declare profile: TypedTables['profile'];
	declare enabledTrackers: TypedTables['enabledTrackers'];
	declare stepsSettings: TypedTables['stepsSettings'];
	declare sleepSettings: TypedTables['sleepSettings'];
	declare screenTimeSettings: TypedTables['screenTimeSettings'];
	declare fitnessSettings: TypedTables['fitnessSettings'];
	declare fitnessExerciseSpeeds: TypedTables['fitnessExerciseSpeeds'];
	declare nutritionProfile: TypedTables['nutritionProfile'];
	declare meditationSettings: TypedTables['meditationSettings'];
	declare breathingSettings: TypedTables['breathingSettings'];
	declare stretchSettings: TypedTables['stretchSettings'];
	declare stretchDifficulties: TypedTables['stretchDifficulties'];
	declare happinessSettings: TypedTables['happinessSettings'];
	declare periodSettings: TypedTables['periodSettings'];
	declare stepDays: TypedTables['stepDays'];
	declare sleepDays: TypedTables['sleepDays'];
	declare sleepApps: TypedTables['sleepApps'];
	declare trackedPackages: TypedTables['trackedPackages'];
	declare screenTimeDays: TypedTables['screenTimeDays'];
	declare screenTimeApps: TypedTables['screenTimeApps'];
	declare fitnessCompletions: TypedTables['fitnessCompletions'];
	declare nutritionEntries: TypedTables['nutritionEntries'];
	declare nutritionMedia: TypedTables['nutritionMedia'];
	declare nutritionMeals: TypedTables['nutritionMeals'];
	declare nutritionIngredients: TypedTables['nutritionIngredients'];
	declare nutritionFastingDates: TypedTables['nutritionFastingDates'];
	declare meditationSessions: TypedTables['meditationSessions'];
	declare breathingExercises: TypedTables['breathingExercises'];
	declare stretchSessions: TypedTables['stretchSessions'];
	declare happinessEntries: TypedTables['happinessEntries'];
	declare happinessReasons: TypedTables['happinessReasons'];
	declare periodEntries: TypedTables['periodEntries'];
	declare gamificationMeta: TypedTables['gamificationMeta'];
	declare gamificationAwards: TypedTables['gamificationAwards'];
	declare achievementUnlocks: TypedTables['achievementUnlocks'];
	declare rewards: TypedTables['rewards'];
	declare redemptions: TypedTables['redemptions'];
	declare nativeSyncStatus: TypedTables['nativeSyncStatus'];

	constructor(name = BROWSER_DATABASE_NAME) {
		super(name);
		this.version(2).stores(DEXIE_STORES);
	}
}

export class DexieRelationalConnection implements RelationalConnection {
	private initialized = false;

	constructor(private readonly database: LocalAppDatabase) {}

	async initialize(defaults: RelationalData) {
		if (this.initialized) return;
		if (!(await this.database.profile.get(1))) await this.write(defaults);
		this.initialized = true;
		if (this.database.name === BROWSER_DATABASE_NAME)
			await Dexie.delete(LEGACY_BROWSER_DATABASE_NAME).catch(() => undefined);
	}

	async read<T extends TableName>(tables: readonly T[], options?: { loadMedia?: boolean }) {
		const data = {} as Pick<RelationalData, T>;
		await Promise.all(
			tables.map(async (name) => {
				const rows = (await this.database.table(name).toArray()) as RelationalData[typeof name];
				const withoutMedia = (rows as RelationalData['nutritionMedia']).map(
					({ blob: _blob, ...row }) => row
				);
				data[name] = (
					name === 'nutritionMedia' && !options?.loadMedia ? withoutMedia : rows
				) as RelationalData[typeof name];
			})
		);
		return data;
	}

	async write(data: Partial<RelationalData>) {
		const names = TABLE_ORDER.filter((name) => data[name] !== undefined);
		if (!names.length) return;
		const tables = names.map((name) => this.database.table(name));
		await this.database.transaction('rw', tables, async () => {
			const current = await this.read(names);
			for (const name of names.toReversed())
				await deleteRemovedRows(
					this.database.table(name),
					name,
					current[name],
					requiredRows(data, name)
				);
			for (const name of names)
				await putChangedRows(
					this.database.table(name),
					name,
					current[name],
					requiredRows(data, name)
				);
		});
	}

	async deleteDatabase() {
		this.database.close();
		await this.database.delete();
		this.initialized = false;
	}
}

export class NativeRelationalConnection implements RelationalConnection {
	private initialization: Promise<void> | undefined;
	private readonly queryBuilder = drizzle(async () => ({ rows: [] }));

	constructor(
		private readonly connectionFactory: NativeDatabaseConnectionFactory,
		private connectionPromise?: Promise<NativeDatabaseConnection>
	) {}

	initialize(defaults: RelationalData) {
		this.initialization ??= this.initializeDatabase(defaults).catch((error) => {
			this.initialization = undefined;
			throw error;
		});
		return this.initialization;
	}

	async read<T extends TableName>(tables: readonly T[], options?: { loadMedia?: boolean }) {
		const connection = await this.connection();
		const data = {} as Pick<RelationalData, T>;
		for (const name of tables) data[name] = await this.readTable(connection, name);
		if (options?.loadMedia && tables.includes('nutritionMedia' as T))
			await loadNativeMedia(data as Partial<RelationalData>);
		return data;
	}

	async write(data: Partial<RelationalData>) {
		const connection = await this.connection();
		const names = TABLE_ORDER.filter((name) => data[name] !== undefined);
		if (!names.length) return;
		const current = {} as Partial<RelationalData>;
		for (const name of names)
			(current as Record<TableName, RelationalData[TableName]>)[name] = await this.readTable(
				connection,
				name
			);
		const mediaStage = await stageNativeMedia(data.nutritionMedia, current.nutritionMedia);
		await connection.beginTransaction();
		try {
			for (const name of names.toReversed())
				await this.deleteRemoved(
					connection,
					name,
					requiredRows(current, name),
					requiredRows(data, name)
				);
			for (const name of names)
				await this.upsertChanged(
					connection,
					name,
					requiredRows(current, name),
					requiredRows(data, name)
				);
			await mediaStage.promote();
			await connection.commitTransaction();
		} catch (error) {
			try {
				await connection.rollbackTransaction();
			} catch {}
			await mediaStage.rollback();
			throw error;
		}
		await mediaStage.cleanup(current.nutritionMedia ?? []);
	}

	async deleteDatabase() {
		const connection = await this.connection();
		try {
			const media = await this.readTable(connection, 'nutritionMedia');
			await Promise.all(media.map(({ relativePath }) => removeNativeFile(relativePath)));
		} catch {}
		await connection.delete();
		this.connectionPromise = undefined;
		this.initialization = undefined;
	}

	private async initializeDatabase(defaults: RelationalData) {
		const connection = await this.connection();
		await connection.execute('PRAGMA foreign_keys = ON;', false);
		await connection.execute('PRAGMA journal_mode = WAL;', false);
		const version = Number(
			(await connection.query('PRAGMA user_version;')).values?.[0]?.user_version
		);
		if (!Number.isInteger(version) || version < 0)
			throw new Error('Invalid SQLite schema version.');
		if (version !== 0 && version !== SQLITE_SCHEMA_VERSION)
			throw new Error(`Unsupported SQLite schema version: ${version}`);
		if (version === 0) {
			await connection.beginTransaction();
			try {
				await connection.execute(SQLITE_SCHEMA_SQL, false);
				await connection.commitTransaction();
			} catch (error) {
				try {
					await connection.rollbackTransaction();
				} catch {}
				throw error;
			}
		}
		const existing = (await connection.query('SELECT id FROM profile WHERE id = 1;')).values?.[0];
		if (!existing) await this.write(defaults);
		await connection.cleanupLegacyDatabase?.();
	}

	private connection() {
		this.connectionPromise ??= this.connectionFactory();
		return this.connectionPromise;
	}

	private async readTable<K extends TableName>(connection: NativeDatabaseConnection, name: K) {
		const table = sqliteTables[name] as AnySQLiteTable;
		const generated = this.queryBuilder.select().from(table).toSQL();
		const values = (await connection.query(generated.sql, generated.params)).values ?? [];
		return values.map((value) => fromDatabaseRow(name, value)) as RelationalData[K];
	}

	private async deleteRemoved<K extends TableName>(
		connection: NativeDatabaseConnection,
		name: K,
		current: RelationalData[K],
		desired: RelationalData[K]
	) {
		const desiredKeys = new Set(desired.map((row) => rowKey(name, row)));
		for (const row of current) {
			if (desiredKeys.has(rowKey(name, row))) continue;
			await connection.run(deleteStatement(name), keyValues(name, row), false);
		}
	}

	private async upsertChanged<K extends TableName>(
		connection: NativeDatabaseConnection,
		name: K,
		current: RelationalData[K],
		desired: RelationalData[K]
	) {
		const currentRows = new Map(current.map((row) => [rowKey(name, row), row]));
		for (const row of desired) {
			if (rowsEqual(name, currentRows.get(rowKey(name, row)), row)) continue;
			await connection.run(upsertStatement(name), databaseValues(name, row), false);
		}
	}
}

export function relationalConnection(
	database: LocalAppDatabase,
	nativeFactory: NativeDatabaseConnectionFactory | null | undefined
): RelationalConnection {
	if (nativeFactory) return new NativeRelationalConnection(nativeFactory);
	return new DexieRelationalConnection(database);
}

let sharedNativeConnection: Promise<NativeDatabaseConnection> | undefined;

export function nativeConnectionFactory(): NativeDatabaseConnectionFactory | null {
	if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
	return sharedNativeDatabaseConnection;
}

async function sharedNativeDatabaseConnection() {
	sharedNativeConnection ??= createNativeDatabaseConnection().catch((error) => {
		sharedNativeConnection = undefined;
		throw error;
	});
	return sharedNativeConnection;
}

export type NativeSQLiteConnectionOwner = {
	closeConnection(database: string, readonly: boolean): Promise<void>;
	createConnection?(
		database: string,
		encrypted: boolean,
		mode: string,
		version: number,
		readonly: boolean
	): Promise<NativeDatabaseConnection & { open(): Promise<void> }>;
	isDatabase?(database: string): Promise<{ result?: boolean }>;
};

export function createNativeDatabaseConnectionAdapter(
	sqlite: NativeSQLiteConnectionOwner,
	connection: NativeDatabaseConnection
): NativeDatabaseConnection {
	return {
		beginTransaction: () => connection.beginTransaction(),
		commitTransaction: () => connection.commitTransaction(),
		rollbackTransaction: () => connection.rollbackTransaction(),
		execute: (statements, transaction) => connection.execute(statements, transaction),
		query: (statement, values) => connection.query(statement, values),
		run: (statement, values, transaction) => connection.run(statement, values, transaction),
		delete: async () => {
			try {
				await connection.delete();
			} finally {
				sharedNativeConnection = undefined;
				await sqlite.closeConnection(SQLITE_DATABASE_NAME, false);
			}
		},
		cleanupLegacyDatabase: async () => cleanupLegacyNativeDatabase(sqlite)
	};
}

async function createNativeDatabaseConnection(): Promise<NativeDatabaseConnection> {
	const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
	const sqlite = new SQLiteConnection(CapacitorSQLite);
	const connection = await sqlite.createConnection(
		SQLITE_DATABASE_NAME,
		false,
		'no-encryption',
		SQLITE_SCHEMA_VERSION,
		false
	);
	await connection.open();
	return createNativeDatabaseConnectionAdapter(sqlite, connection);
}

async function cleanupLegacyNativeDatabase(sqlite: NativeSQLiteConnectionOwner) {
	if (!(await sqlite.isDatabase?.(LEGACY_SQLITE_DATABASE_NAME))?.result || !sqlite.createConnection)
		return;
	const legacy = await sqlite.createConnection(
		LEGACY_SQLITE_DATABASE_NAME,
		false,
		'no-encryption',
		1,
		false
	);
	try {
		await legacy.open();
		await legacy.delete();
	} finally {
		await sqlite.closeConnection(LEGACY_SQLITE_DATABASE_NAME, false);
	}
}

async function deleteRemovedRows<K extends TableName>(
	table: Table,
	name: K,
	current: RelationalData[K],
	desired: RelationalData[K]
) {
	const desiredKeys = new Set(desired.map((row) => rowKey(name, row)));
	const keys = current
		.filter((row) => !desiredKeys.has(rowKey(name, row)))
		.map((row) => dexieKey(name, row));
	if (keys.length) await table.bulkDelete(keys);
}

async function putChangedRows<K extends TableName>(
	table: Table,
	name: K,
	current: RelationalData[K],
	desired: RelationalData[K]
) {
	const currentRows = new Map(current.map((row) => [rowKey(name, row), row]));
	const changed = desired.filter(
		(row) => !rowsEqual(name, currentRows.get(rowKey(name, row)), row)
	);
	if (changed.length) await table.bulkPut(changed);
}

function rowKey<K extends TableName>(name: K, row: RelationalRows[K]) {
	return TABLE_KEYS[name].map((key) => String(row[key])).join('\u0000');
}

function keyValues<K extends TableName>(name: K, row: RelationalRows[K]) {
	return TABLE_KEYS[name].map((key) => databaseValue(name, key, row[key]));
}

function dexieKey<K extends TableName>(name: K, row: RelationalRows[K]) {
	const values = TABLE_KEYS[name].map((key) => row[key]);
	return values.length === 1 ? values[0] : values;
}

function rowsEqual<K extends TableName>(
	name: K,
	left: RelationalRows[K] | undefined,
	right: RelationalRows[K]
) {
	if (!left) return false;
	if (name === 'nutritionMedia') {
		const leftMedia = left as RelationalRows['nutritionMedia'];
		const rightMedia = right as RelationalRows['nutritionMedia'];
		return (
			leftMedia.id === rightMedia.id &&
			leftMedia.mimeType === rightMedia.mimeType &&
			leftMedia.byteSize === rightMedia.byteSize &&
			leftMedia.relativePath === rightMedia.relativePath &&
			leftMedia.createdAt === rightMedia.createdAt
		);
	}
	return JSON.stringify(left) === JSON.stringify(right);
}

function deleteStatement(name: TableName) {
	const columns = TABLE_COLUMNS[name] as Record<string, string>;
	const where = TABLE_KEYS[name].map((key) => `"${columns[key]}" = ?`).join(' AND ');
	return `DELETE FROM "${getTableName(sqliteTables[name])}" WHERE ${where};`;
}

function upsertStatement(name: TableName) {
	const tableName = getTableName(sqliteTables[name]);
	const tableColumns = TABLE_COLUMNS[name] as Record<string, string>;
	const columns = Object.entries(tableColumns).filter(([property]) => property !== 'blob');
	const names = columns.map(([, column]) => `"${column}"`);
	const keyColumns = new Set(TABLE_KEYS[name].map((key) => tableColumns[key]));
	const updates = columns
		.filter(([, column]) => !keyColumns.has(column))
		.map(([, column]) => `"${column}" = excluded."${column}"`);
	const conflict = [...keyColumns].map((column) => `"${column}"`).join(', ');
	const action = updates.length ? `DO UPDATE SET ${updates.join(', ')}` : 'DO NOTHING';
	return `INSERT INTO "${tableName}" (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')}) ON CONFLICT (${conflict}) ${action};`;
}

function databaseValues<K extends TableName>(name: K, row: RelationalRows[K]) {
	return Object.keys(TABLE_COLUMNS[name])
		.filter((property) => property !== 'blob')
		.map((property) => databaseValue(name, property, row[property as keyof RelationalRows[K]]));
}

function databaseValue(name: TableName, property: string, value: unknown) {
	if (BOOLEAN_COLUMNS[name]?.includes(property)) return value ? 1 : 0;
	return value ?? null;
}

function fromDatabaseRow<K extends TableName>(name: K, input: Record<string, unknown>) {
	const booleans = new Set(BOOLEAN_COLUMNS[name] ?? []);
	const columns = TABLE_COLUMNS[name] as Record<string, string>;
	return Object.fromEntries(
		Object.entries(columns)
			.filter(([property]) => property !== 'blob')
			.map(([property, column]) => [
				property,
				booleans.has(property) ? Boolean(input[column]) : (input[column] ?? null)
			])
	) as RelationalRows[K];
}

async function loadNativeMedia(data: Partial<RelationalData>) {
	if (!data.nutritionMedia?.length) return;
	const { Directory, Filesystem } = await import('@capacitor/filesystem');
	for (const media of data.nutritionMedia) {
		try {
			const result = await Filesystem.readFile({
				path: media.relativePath,
				directory: Directory.Data
			});
			const base64 = typeof result.data === 'string' ? result.data : '';
			media.blob = base64Blob(base64, media.mimeType);
		} catch {
			media.blob = undefined;
		}
	}
}

async function stageNativeMedia(
	media: RelationalData['nutritionMedia'] | undefined,
	current: RelationalData['nutritionMedia'] | undefined
) {
	if (!media) return emptyMediaStage();
	const { Directory, Filesystem } = await import('@capacitor/filesystem');
	const existingPaths = new Set((current ?? []).map(({ relativePath }) => relativePath));
	const staged = media.filter(
		(item): item is typeof item & { blob: Blob } =>
			item.blob instanceof Blob && !existingPaths.has(item.relativePath)
	);
	const written: typeof staged = [];
	try {
		for (const item of staged) {
			await Filesystem.writeFile({
				path: `${item.relativePath}.tmp`,
				data: await blobBase64(item.blob),
				directory: Directory.Data,
				recursive: true
			});
			written.push(item);
		}
	} catch (error) {
		await Promise.all(written.map((item) => removeNativeFile(`${item.relativePath}.tmp`)));
		throw error;
	}
	const promoted: typeof staged = [];
	return {
		rollback: () =>
			Promise.all([
				...written.map((item) => removeNativeFile(`${item.relativePath}.tmp`)),
				...promoted.map((item) => removeNativeFile(item.relativePath))
			]).then(() => undefined),
		promote: async () => {
			for (const item of written) {
				await Filesystem.rename({
					from: `${item.relativePath}.tmp`,
					to: item.relativePath,
					directory: Directory.Data
				});
				promoted.push(item);
			}
		},
		cleanup: async (previous: RelationalData['nutritionMedia']) => {
			const retained = new Set(media.map(({ relativePath }) => relativePath));
			await Promise.all(
				previous
					.filter((item) => !retained.has(item.relativePath))
					.map((item) => removeNativeFile(item.relativePath))
			);
		}
	};
}

function emptyMediaStage() {
	return {
		rollback: () => Promise.resolve(),
		promote: () => Promise.resolve(),
		cleanup: (_current: RelationalData['nutritionMedia']) => Promise.resolve()
	};
}

async function removeNativeFile(path: string) {
	const { Directory, Filesystem } = await import('@capacitor/filesystem');
	try {
		await Filesystem.deleteFile({ path, directory: Directory.Data });
	} catch {}
}

function base64Blob(base64: string, mimeType: string) {
	const binary = atob(base64);
	const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	return new Blob([bytes], { type: mimeType });
}

async function blobBase64(blob: Blob) {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function requiredRows<K extends TableName>(data: Partial<RelationalData>, name: K) {
	const rows = data[name];
	if (!rows) throw new Error(`Missing relational table data: ${name}`);
	return rows;
}

export function syncStatusRows(status: MobileSyncStatus): RelationalData['nativeSyncStatus'] {
	return Object.entries(status.trackers).map(([trackerId, tracker]) => ({
		trackerId,
		permission: tracker.permission,
		outcome: tracker.outcome,
		lastAttemptAt: tracker.lastAttemptAt ?? null,
		lastSuccessAt: tracker.lastSuccessAt ?? null,
		failureCategory: tracker.failure?.category ?? null,
		failureMessage: tracker.failure?.message ?? null,
		failureRetryable: tracker.failure?.retryable ?? true
	}));
}

export function rowsSyncStatus(rows: RelationalData['nativeSyncStatus']): MobileSyncStatus {
	const status = createEmptyStatus();
	for (const row of rows) {
		if (!(row.trackerId in status.trackers)) continue;
		const trackerId = row.trackerId as keyof typeof status.trackers;
		status.trackers[trackerId] = {
			permission: row.permission as MobileSyncStatus['trackers'][typeof trackerId]['permission'],
			outcome: row.outcome as MobileSyncStatus['trackers'][typeof trackerId]['outcome'],
			...(row.lastAttemptAt ? { lastAttemptAt: row.lastAttemptAt } : {}),
			...(row.lastSuccessAt ? { lastSuccessAt: row.lastSuccessAt } : {}),
			...(row.failureCategory && row.failureMessage
				? {
						failure: {
							category: row.failureCategory as 'permission' | 'validation' | 'native',
							message: row.failureMessage,
							retryable: row.failureRetryable
						}
					}
				: {})
		};
	}
	return parseStoredStatus(status);
}
