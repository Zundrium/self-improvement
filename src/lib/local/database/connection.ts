import { Capacitor } from '@capacitor/core';
import Dexie, { type EntityTable, type IndexableType, type Table } from 'dexie';
import { getTableName } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import type { MobileSyncStatus } from '$domain/model';
import { createEmptyStatus, parseStoredStatus } from '$domain/status';
import {
	BOOLEAN_COLUMNS,
	BROWSER_DATABASE_NAME,
	DEXIE_STORES,
	SQLITE_DATABASE_NAME,
	SQLITE_SCHEMA_SQL,
	SQLITE_SCHEMA_VERSION,
	SQLITE_V2_TO_V3_SQL,
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
};
export type NativeDatabaseConnectionFactory = () => Promise<NativeDatabaseConnection>;

export interface RelationalConnection {
	initialize(defaults: RelationalData): Promise<void>;
	read<T extends TableName>(
		tables: readonly T[],
		options?: { loadMedia?: boolean }
	): Promise<Pick<RelationalData, T>>;
	readRows<T extends TableName>(
		table: T,
		query: RowQuery,
		options?: { loadMedia?: boolean }
	): Promise<RelationalData[T]>;
	readSnapshot<T>(
		tables: readonly TableName[],
		operation: (read: RelationalRowReader) => Promise<T>
	): Promise<T>;
	write(data: Partial<RelationalData>, options?: { replaceMedia?: boolean }): Promise<void>;
	deleteDatabase(): Promise<void>;
}
export type RelationalRowReader = <T extends TableName>(
	table: T,
	query: RowQuery,
	options?: { loadMedia?: boolean }
) => Promise<RelationalData[T]>;

export type RowQuery =
	| { equals: { key: string; value: unknown } }
	| { anyOf: { key: string; values: unknown[] } }
	| { between: { key: string; lower: unknown; upper: unknown } };

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
	declare choresSessions: TypedTables['choresSessions'];
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
		const { choresSessions: _choresSessions, ...versionTwoStores } = DEXIE_STORES;
		this.version(2).stores(versionTwoStores);
		this.version(3)
			.stores(DEXIE_STORES)
			.upgrade(async (transaction) => {
				const enabledTrackers = transaction.table('enabledTrackers');
				if (await enabledTrackers.get('chores')) return;
				const rows = (await enabledTrackers.toArray()) as Array<{
					position: number;
				}>;
				const position = Math.max(-1, ...rows.map((row) => row.position)) + 1;
				await enabledTrackers.put({ trackerId: 'chores', position });
			});
	}
}

export class DexieRelationalConnection implements RelationalConnection {
	private initialized = false;

	constructor(private readonly database: LocalAppDatabase) {}

	async initialize(defaults: RelationalData) {
		if (this.initialized) return;
		if (!(await this.database.profile.get(1))) await this.write(defaults);
		this.initialized = true;
	}

	async read<T extends TableName>(tables: readonly T[], options?: { loadMedia?: boolean }) {
		const data = {} as Pick<RelationalData, T>;
		const dexieTables = tables.map((name) => this.database.table(name));
		await this.database.transaction('r', dexieTables, async () => {
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
		});
		return data;
	}

	async write(data: Partial<RelationalData>, _options?: { replaceMedia?: boolean }) {
		const names = TABLE_ORDER.filter((name) => data[name] !== undefined);
		if (!names.length) return;
		const tables = names.map((name) => this.database.table(name));
		await this.database.transaction('rw', tables, async () => {
			const current = await this.read(names);
			data = resolveStoredMediaReferences(data, current);
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

	async readRows<T extends TableName>(
		table: T,
		query: RowQuery,
		options?: { loadMedia?: boolean }
	) {
		return this.readSnapshot([table], (read) => read(table, query, options));
	}

	readSnapshot<T>(
		tables: readonly TableName[],
		operation: (read: RelationalRowReader) => Promise<T>
	) {
		return this.database.transaction(
			'r',
			tables.map((table) => this.database.table(table)),
			() => operation((table, query, options) => this.readRowsNow(table, query, options))
		);
	}

	private async readRowsNow<T extends TableName>(
		table: T,
		query: RowQuery,
		options?: { loadMedia?: boolean }
	) {
		const rows = (await dexieQuery(
			this.database.table(table),
			query
		).toArray()) as RelationalData[T];
		if (table !== 'nutritionMedia' || options?.loadMedia) return rows;
		return (rows as RelationalData['nutritionMedia']).map(
			({ blob: _blob, ...row }) => row
		) as RelationalData[T];
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
		return serializeNativeOperation(connection, async () => {
			const data = {} as Pick<RelationalData, T>;
			await connection.beginTransaction();
			try {
				for (const name of tables) data[name] = await this.readTable(connection, name);
				await connection.commitTransaction();
			} catch (error) {
				try {
					await connection.rollbackTransaction();
				} catch {}
				throw error;
			}
			if (options?.loadMedia && tables.includes('nutritionMedia' as T))
				await loadNativeMedia(data as Partial<RelationalData>);
			return data;
		});
	}

	async write(data: Partial<RelationalData>, options?: { replaceMedia?: boolean }) {
		const connection = await this.connection();
		return serializeNativeOperation(connection, () =>
			this.writeNow(connection, data, options?.replaceMedia)
		);
	}

	async readRows<T extends TableName>(
		table: T,
		query: RowQuery,
		options?: { loadMedia?: boolean }
	) {
		return this.readSnapshot([table], (read) => read(table, query, options));
	}

	async readSnapshot<T>(
		_tables: readonly TableName[],
		operation: (read: RelationalRowReader) => Promise<T>
	) {
		const connection = await this.connection();
		return serializeNativeOperation(connection, async () => {
			await connection.beginTransaction();
			try {
				const result = await operation(async (table, query, options) => {
					const rows = await this.readTableWhere(connection, table, query);
					if (options?.loadMedia && table === 'nutritionMedia')
						await loadNativeMedia({
							nutritionMedia: rows as RelationalData['nutritionMedia']
						});
					return rows;
				});
				await connection.commitTransaction();
				return result;
			} catch (error) {
				try {
					await connection.rollbackTransaction();
				} catch {}
				throw error;
			}
		});
	}

	private async writeNow(
		connection: NativeDatabaseConnection,
		data: Partial<RelationalData>,
		replaceMedia = false
	) {
		const names = TABLE_ORDER.filter((name) => data[name] !== undefined);
		if (!names.length) return;
		const current = {} as Partial<RelationalData>;
		for (const name of names)
			(current as Record<TableName, RelationalData[TableName]>)[name] = await this.readTable(
				connection,
				name
			);
		data = resolveStoredMediaReferences(data, current);
		const mediaStage = await stageNativeMedia(
			data.nutritionMedia,
			current.nutritionMedia,
			replaceMedia
		);
		try {
			await connection.beginTransaction();
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
		await serializeNativeOperation(connection, async () => {
			try {
				const media = await this.readTable(connection, 'nutritionMedia');
				await Promise.all(media.map(({ relativePath }) => removeNativeFile(relativePath)));
			} catch {}
			await connection.delete();
		});
		this.connectionPromise = undefined;
		this.initialization = undefined;
	}

	private async initializeDatabase(defaults: RelationalData) {
		const connection = await this.connection();
		await serializeNativeOperation(connection, async () => {
			const version = Number(
				(await connection.query('PRAGMA user_version;')).values?.[0]?.user_version
			);
			if (!Number.isInteger(version) || version < 0)
				throw new Error('Invalid SQLite schema version.');
			if (![0, 2, SQLITE_SCHEMA_VERSION].includes(version))
				throw new Error(`Unsupported SQLite schema version: ${version}`);
			if (version === 0) await this.runSchemaStatements(connection, SQLITE_SCHEMA_SQL);
			if (version === 2) await this.runSchemaStatements(connection, SQLITE_V2_TO_V3_SQL);
			const existing = (await connection.query('SELECT id FROM profile WHERE id = 1;')).values?.[0];
			if (!existing) await this.writeNow(connection, defaults);
		});
	}

	private async runSchemaStatements(connection: NativeDatabaseConnection, statements: string) {
		await connection.beginTransaction();
		try {
			await connection.execute(statements, false);
			await connection.commitTransaction();
		} catch (error) {
			try {
				await connection.rollbackTransaction();
			} catch {}
			throw error;
		}
	}

	private connection() {
		if (this.connectionPromise) return this.connectionPromise;
		const connectionPromise = this.connectionFactory();
		this.connectionPromise = connectionPromise;
		void connectionPromise.catch(() => {
			if (this.connectionPromise === connectionPromise) this.connectionPromise = undefined;
		});
		return this.connectionPromise;
	}

	private async readTable<K extends TableName>(connection: NativeDatabaseConnection, name: K) {
		const table = sqliteTables[name] as AnySQLiteTable;
		const generated = this.queryBuilder.select().from(table).toSQL();
		const values = (await connection.query(generated.sql, generated.params)).values ?? [];
		return values.map((value) => fromDatabaseRow(name, value)) as RelationalData[K];
	}

	private async readTableWhere<K extends TableName>(
		connection: NativeDatabaseConnection,
		name: K,
		query: RowQuery
	) {
		const column = (TABLE_COLUMNS[name] as Record<string, string>)[queryKey(query)];
		if (!column) throw new Error(`Unknown ${name} query column.`);
		const { clause, values } = sqlQuery(query, column);
		const tableName = getTableName(sqliteTables[name]);
		const result =
			(await connection.query(`SELECT * FROM "${tableName}" WHERE ${clause};`, values)).values ??
			[];
		return result.map((value) => fromDatabaseRow(name, value)) as RelationalData[K];
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

const nativeOperationQueues = new WeakMap<NativeDatabaseConnection, Promise<void>>();

function serializeNativeOperation<T>(
	connection: NativeDatabaseConnection,
	operation: () => Promise<T>
) {
	const previous = nativeOperationQueues.get(connection) ?? Promise.resolve();
	const result = previous.then(operation, operation);
	nativeOperationQueues.set(
		connection,
		result.then(
			() => undefined,
			() => undefined
		)
	);
	return result;
}

export function relationalConnection(
	database: LocalAppDatabase,
	nativeFactory: NativeDatabaseConnectionFactory | null | undefined
): RelationalConnection {
	if (nativeFactory) return new NativeRelationalConnection(nativeFactory);
	return new DexieRelationalConnection(database);
}

type NativeConnectionGlobal = typeof globalThis & {
	__zuncreativeSelfImprovementNativeConnection?: Promise<NativeDatabaseConnection>;
};

function nativeConnectionGlobal() {
	return globalThis as NativeConnectionGlobal;
}

export function nativeConnectionFactory(): NativeDatabaseConnectionFactory | null {
	if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
	return sharedNativeDatabaseConnection;
}

function sharedNativeDatabaseConnection() {
	const scope = nativeConnectionGlobal();
	if (scope.__zuncreativeSelfImprovementNativeConnection)
		return scope.__zuncreativeSelfImprovementNativeConnection;
	const connectionPromise = createNativeDatabaseConnection();
	scope.__zuncreativeSelfImprovementNativeConnection = connectionPromise;
	void connectionPromise.catch(() => {
		if (scope.__zuncreativeSelfImprovementNativeConnection === connectionPromise)
			scope.__zuncreativeSelfImprovementNativeConnection = undefined;
	});
	return connectionPromise;
}

function clearSharedNativeDatabaseConnection() {
	nativeConnectionGlobal().__zuncreativeSelfImprovementNativeConnection = undefined;
}

export type NativeSQLiteConnectionOwner = {
	closeConnection(database: string, readonly: boolean): Promise<void>;
	checkConnectionsConsistency?(): Promise<{ result?: boolean }>;
	createConnection?(
		database: string,
		encrypted: boolean,
		mode: string,
		version: number,
		readonly: boolean
	): Promise<NativeDatabaseConnection & { open(): Promise<void> }>;
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
				clearSharedNativeDatabaseConnection();
				await sqlite.closeConnection(SQLITE_DATABASE_NAME, false);
			}
		}
	};
}

async function createNativeDatabaseConnection(): Promise<NativeDatabaseConnection> {
	const { openNativeSQLiteDatabase } = await import('$native/database');
	const { sqlite, connection } = await openNativeSQLiteDatabase(
		SQLITE_DATABASE_NAME,
		SQLITE_SCHEMA_VERSION
	);
	return createNativeDatabaseConnectionAdapter(sqlite, connection);
}

export async function openNativeDatabaseConnection(
	sqlite: NativeSQLiteConnectionOwner
): Promise<NativeDatabaseConnection> {
	await sqlite.checkConnectionsConsistency?.();
	const connection = await createNativeSQLiteConnection(sqlite);
	try {
		await connection.open();
	} catch (error) {
		try {
			await sqlite.closeConnection(SQLITE_DATABASE_NAME, false);
		} catch {}
		throw error;
	}
	return createNativeDatabaseConnectionAdapter(sqlite, connection);
}

async function createNativeSQLiteConnection(sqlite: NativeSQLiteConnectionOwner) {
	if (!sqlite.createConnection)
		throw new Error('Native SQLite connection creation is unavailable.');
	return sqlite.createConnection(
		SQLITE_DATABASE_NAME,
		false,
		'no-encryption',
		SQLITE_SCHEMA_VERSION,
		false
	);
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

function resolveStoredMediaReferences(
	data: Partial<RelationalData>,
	current: Partial<RelationalData>
) {
	if (!data.nutritionMedia) return data;
	const currentMedia = new Map((current.nutritionMedia ?? []).map((item) => [item.id, item]));
	const nutritionMedia = data.nutritionMedia.map((item) => {
		if (item.relativePath !== `stored-media:${item.id}`) return item;
		const stored = currentMedia.get(item.id);
		if (!stored) throw new Error(`Stored nutrition media ${item.id} could not be resolved.`);
		return stored;
	});
	return { ...data, nutritionMedia };
}

function dexieQuery(table: Table, query: RowQuery) {
	if ('equals' in query)
		return table.where(query.equals.key).equals(query.equals.value as IndexableType);
	if ('anyOf' in query)
		return table.where(query.anyOf.key).anyOf(query.anyOf.values as IndexableType[]);
	return table
		.where(query.between.key)
		.between(
			query.between.lower as IndexableType,
			query.between.upper as IndexableType,
			true,
			true
		);
}

function queryKey(query: RowQuery) {
	if ('equals' in query) return query.equals.key;
	if ('anyOf' in query) return query.anyOf.key;
	return query.between.key;
}

function sqlQuery(query: RowQuery, column: string) {
	if ('equals' in query) return { clause: `"${column}" = ?`, values: [query.equals.value] };
	if ('anyOf' in query) {
		if (!query.anyOf.values.length) return { clause: '1 = 0', values: [] };
		return {
			clause: `"${column}" IN (${query.anyOf.values.map(() => '?').join(', ')})`,
			values: query.anyOf.values
		};
	}
	return {
		clause: `"${column}" BETWEEN ? AND ?`,
		values: [query.between.lower, query.between.upper]
	};
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
	current: RelationalData['nutritionMedia'] | undefined,
	replaceExisting = false
) {
	if (!media) return emptyMediaStage();
	const { Directory, Filesystem } = await import('@capacitor/filesystem');
	const existingPaths = new Set((current ?? []).map(({ relativePath }) => relativePath));
	const candidates = media.filter(
		(item): item is typeof item & { blob: Blob } =>
			item.blob instanceof Blob && (replaceExisting || !existingPaths.has(item.relativePath))
	);
	const operationId = crypto.randomUUID();
	const staged = candidates.map((item, index) => ({
		item,
		temporaryPath: `${item.relativePath}.tmp-${operationId}-${index}`,
		backupPath: `${item.relativePath}.bak-${operationId}-${index}`,
		shouldSecureOriginal: existingPaths.has(item.relativePath),
		originalSecured: false,
		promoted: false
	}));
	const written: typeof staged = [];
	try {
		for (const entry of staged) {
			await Filesystem.writeFile({
				path: entry.temporaryPath,
				data: await blobBase64(entry.item.blob),
				directory: Directory.Data,
				recursive: true
			});
			written.push(entry);
		}
	} catch (error) {
		await Promise.all(written.map((entry) => removeNativeFile(entry.temporaryPath)));
		throw error;
	}
	return {
		rollback: async () => {
			await Promise.all(written.map((entry) => removeNativeFile(entry.temporaryPath)));
			for (const entry of written.toReversed()) {
				if (entry.promoted) await deleteNativeFileIfPresent(entry.item.relativePath);
				if (entry.originalSecured)
					await Filesystem.rename({
						from: entry.backupPath,
						to: entry.item.relativePath,
						directory: Directory.Data
					});
			}
		},
		promote: async () => {
			for (const entry of written) {
				if (entry.shouldSecureOriginal) {
					try {
						await Filesystem.rename({
							from: entry.item.relativePath,
							to: entry.backupPath,
							directory: Directory.Data
						});
						entry.originalSecured = true;
					} catch (error) {
						if (await nativeFileExists(entry.item.relativePath)) throw error;
					}
				}
				await Filesystem.rename({
					from: entry.temporaryPath,
					to: entry.item.relativePath,
					directory: Directory.Data
				});
				entry.promoted = true;
			}
		},
		cleanup: async (previous: RelationalData['nutritionMedia']) => {
			await Promise.all(
				written
					.filter((entry) => entry.originalSecured)
					.map((entry) => removeNativeFile(entry.backupPath))
			);
			const retained = new Set(media.map(({ relativePath }) => relativePath));
			await Promise.all(
				previous
					.filter((item) => !retained.has(item.relativePath))
					.map((item) => removeNativeFile(item.relativePath))
			);
		}
	};
}

async function nativeFileExists(path: string) {
	const { Directory, Filesystem } = await import('@capacitor/filesystem');
	try {
		await Filesystem.stat({ path, directory: Directory.Data });
		return true;
	} catch (error) {
		if (isMissingNativeFileError(error)) return false;
		throw error;
	}
}

async function deleteNativeFileIfPresent(path: string) {
	const { Directory, Filesystem } = await import('@capacitor/filesystem');
	try {
		await Filesystem.deleteFile({ path, directory: Directory.Data });
	} catch (error) {
		if (!isMissingNativeFileError(error)) throw error;
	}
}

function isMissingNativeFileError(error: unknown) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		error.code === 'OS-PLUG-FILE-0008'
	);
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
