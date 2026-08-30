import { Capacitor } from '@capacitor/core';
import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { localDateForInstant } from '$lib/trackers/dates';
import type { AppTrackerId } from '$lib/trackers/registry';
import { appTrackers } from '$lib/trackers/registry';
import { STRETCH_ACTIVITY_IDS, STRETCH_DIFFICULTIES, TRACKER_DEFAULTS } from './tracker-settings';

export const LOCAL_STATE_VERSION = 1 as const;
const STATE_ID = 'current';
const SQLITE_SCHEMA_VERSION = 1;
const SQLITE_DATABASE_NAME = 'self-improvement-local';

type NativeQueryResult = { values?: Array<Record<string, unknown>> };

export type NativeAppStateConnection = {
	beginTransaction(): Promise<unknown>;
	commitTransaction(): Promise<unknown>;
	rollbackTransaction(): Promise<unknown>;
	execute(statements: string, transaction?: boolean): Promise<unknown>;
	query(statement: string, values?: unknown[]): Promise<NativeQueryResult>;
	run(statement: string, values?: unknown[], transaction?: boolean): Promise<unknown>;
	delete(): Promise<void>;
};

export type NativeAppStateConnectionFactory = () => Promise<NativeAppStateConnection>;

let sharedNativeConnection: Promise<NativeAppStateConnection> | undefined;

const date = z.iso.date();
const instant = z.iso.datetime();
const userSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(120),
	createdAt: instant
});
const nutritionTotalsSchema = z.object({
	calories: z.number().nonnegative(),
	proteinG: z.number().nonnegative(),
	carbsG: z.number().nonnegative(),
	fatG: z.number().nonnegative(),
	count: z.number().int().nonnegative()
});
const ingredientSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	quantity: z.number().nonnegative(),
	unit: z.string(),
	calories: z.number().nonnegative(),
	proteinG: z.number().nonnegative(),
	carbsG: z.number().nonnegative(),
	fatG: z.number().nonnegative(),
	notes: z.string()
});
const mealSchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	imageDataUrl: z.string().default(''),
	ingredients: z.array(ingredientSchema),
	totals: nutritionTotalsSchema
});
const nutritionEntrySchema = z.object({
	id: z.string().min(1),
	date,
	name: z.string(),
	notes: z.string(),
	createdAt: instant,
	thumbnail: z.string().default(''),
	meals: z.array(mealSchema),
	totals: nutritionTotalsSchema
});
const nutritionProfileSchema = z.object({
	weightKg: z.number().min(20).max(300),
	heightCm: z.number().min(100).max(250),
	age: z.number().int().min(10).max(120),
	gender: z.enum(['male', 'female']),
	activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
	dailyCalorieGoal: z.number().int().min(500).max(10_000),
	goalMode: z.enum(['estimated', 'custom']),
	eatingWindowEnabled: z.boolean(),
	eatingWindowStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
	eatingWindowEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
});
const sleepUsageAppSchema = z.object({
	package: z.string().min(1),
	name: z.string().min(1),
	seconds: z.number().int().nonnegative()
});
const sleepSummarySchema = z.object({
	localDate: date,
	configuredBedtime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
	windowStartAt: instant.nullable(),
	windowEndAt: instant.nullable(),
	lateUsageSeconds: z.number().int().nonnegative(),
	latestScreenActivityAt: instant.nullable(),
	usedApps: z.array(sleepUsageAppSchema),
	violatingApps: z.array(sleepUsageAppSchema),
	status: z.enum(['pending', 'pass', 'fail']),
	sourceTimestamp: instant.nullable()
});
const screenTimeAppSchema = z.object({
	package: z.string().min(1),
	name: z.string().min(1),
	minutes: z.number().int().min(0).max(1_440),
	last_used: instant
});
const rewardSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(80),
	emoji: z.string().min(1).max(16),
	price: z.number().int().min(1).max(1_000_000)
});
const stateSchema = z.strictObject({
	version: z.literal(LOCAL_STATE_VERSION),
	updatedAt: instant,
	user: userSchema,
	enabledTrackerIds: z.array(
		z.enum([
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
		])
	),
	gamification: z.object({
		startedLocalDate: date,
		awards: z.array(
			z.object({
				trackerId: z.string().min(1),
				localDate: date,
				points: z.number().int().positive()
			})
		),
		achievementUnlocks: z
			.array(
				z.object({
					achievementId: z.string().min(1),
					unlockedAt: instant
				})
			)
			.default([])
			.transform(uniqueAchievementUnlocks)
	}),
	rewards: z.array(rewardSchema),
	redemptions: z.array(rewardSchema.extend({ redeemedAt: instant })),
	steps: z.object({
		dailyGoal: z.number().int().min(1_000).max(100_000),
		lastReceivedAt: instant.nullable(),
		days: z.array(z.object({ date, count: z.number().int().nonnegative(), sourceEndAt: instant }))
	}),
	sleep: z.object({
		bedtime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
		remindersEnabled: z.boolean(),
		lastReceivedAt: instant.nullable(),
		days: z.array(sleepSummarySchema)
	}),
	screenTime: z.object({
		dailyLimitMinutes: z
			.number()
			.int()
			.min(1)
			.max(1_440)
			.default(TRACKER_DEFAULTS.screenTime.dailyLimitMinutes),
		lastReceivedAt: instant.nullable(),
		trackedPackages: z.array(z.string().min(1)),
		days: z.array(
			z.object({
				date,
				totalMinutes: z.number().int().min(0).max(1_440),
				apps: z.array(screenTimeAppSchema),
				sourceTimestamp: instant
			})
		)
	}),
	fitness: z.object({
		defaultSets: z.number().int().min(1).max(10).default(TRACKER_DEFAULTS.fitness.defaultSets),
		completedDays: z.array(
			z.object({
				workoutId: z.number().int().positive(),
				dateKey: date,
				completedAt: instant.optional()
			})
		),
		exerciseSpeeds: z.record(z.string(), z.number().int().min(25).max(200))
	}),
	nutrition: z.object({
		profile: nutritionProfileSchema.nullable(),
		entries: z.array(nutritionEntrySchema),
		fastingDates: z.array(date)
	}),
	meditation: z.object({
		defaultDurationSeconds: z
			.number()
			.int()
			.min(60)
			.max(7_200)
			.default(TRACKER_DEFAULTS.meditation.defaultDurationSeconds),
		sessions: z.array(
			z.object({
				id: z.string().min(1),
				localDate: date,
				durationSeconds: z.number().int().positive(),
				startedAt: z.number().int().positive()
			})
		)
	}),
	breathing: z.object({
		rounds: z.number().int().min(1).max(20).default(TRACKER_DEFAULTS.breathing.rounds),
		includeHold: z.boolean().default(TRACKER_DEFAULTS.breathing.includeHold),
		exercises: z.array(
			z.object({
				localDate: date,
				technique: z.string().min(1),
				durationSeconds: z.number().int().positive(),
				startedAt: z.number().int().positive()
			})
		)
	}),
	stretch: z
		.object({
			holdSeconds: z.number().int().min(5).max(600).default(TRACKER_DEFAULTS.stretch.holdSeconds),
			difficulties: z
				.record(z.enum(STRETCH_ACTIVITY_IDS), z.enum(STRETCH_DIFFICULTIES))
				.default(TRACKER_DEFAULTS.stretch.difficulties),
			sessions: z.array(
				z.object({
					id: z.string().min(1),
					localDate: date,
					holdSeconds: z.number().int().min(5).max(600),
					completedAt: instant,
					hardVariationCompleted: z.boolean().optional()
				})
			)
		})
		.default({
			holdSeconds: TRACKER_DEFAULTS.stretch.holdSeconds,
			difficulties: TRACKER_DEFAULTS.stretch.difficulties,
			sessions: []
		}),
	happiness: z.object({
		defaultRating: z
			.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
			.default(TRACKER_DEFAULTS.happiness.defaultRating),
		entries: z.array(
			z.object({
				localDate: date,
				rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
				reasons: z.array(z.string().min(1)),
				updatedAt: instant
			})
		)
	}),
	period: z.object({
		defaultFlow: z
			.enum(['spotting', 'light', 'medium', 'heavy'])
			.default(TRACKER_DEFAULTS.period.defaultFlow),
		fallbackCycleDays: z
			.number()
			.int()
			.min(15)
			.max(60)
			.default(TRACKER_DEFAULTS.period.fallbackCycleDays),
		entries: z.array(
			z.object({
				localDate: date,
				flow: z.enum(['spotting', 'light', 'medium', 'heavy']),
				notes: z.string().max(1_000),
				updatedAt: instant
			})
		)
	})
});

export type LocalAppState = z.infer<typeof stateSchema>;
type StateRow = { id: typeof STATE_ID; document: LocalAppState };

export class LocalAppDatabase extends Dexie {
	appState!: EntityTable<StateRow, 'id'>;

	constructor(name = 'self-improvement-local') {
		super(name);
		this.version(1).stores({ appState: 'id' });
	}
}

export class LocalAppStore {
	private writeQueue = Promise.resolve();
	private nativeConnectionPromise: Promise<NativeAppStateConnection> | undefined;
	private nativeInitialization: Promise<void> | undefined;

	constructor(
		private readonly database = new LocalAppDatabase(),
		private readonly nativeConnectionFactory: NativeAppStateConnectionFactory | null | undefined = undefined
	) {}

	async read() {
		if (this.nativeConnectionFactoryForStore()) {
			return this.serialize(async () => {
				const connection = await this.nativeConnection();
				if (!connection) throw new Error('Native SQLite connection is unavailable.');
				return clone(await this.readNativeState(connection));
			});
		}
		return clone(await this.ensureState());
	}

	update(mutator: (state: LocalAppState) => void | Promise<void>) {
		return this.serialize(() => this.updateTransaction(mutator));
	}

	updateWithPrevious(mutator: (state: LocalAppState) => void | Promise<void>) {
		return this.serialize(() => this.updateWithPreviousTransaction(mutator));
	}

	async exportState() {
		return this.read();
	}

	replaceState(input: unknown) {
		const state = validateLocalAppState(input);
		return this.serialize(() => this.replaceTransaction(state));
	}

	deleteDatabase() {
		return this.serialize(async () => {
			const connection = await this.nativeConnection();
			if (!connection) {
				this.database.close();
				await this.database.delete();
				return;
			}
			try {
				await connection.delete();
			} finally {
				this.nativeInitialization = undefined;
				this.nativeConnectionPromise = undefined;
				if (this.nativeConnectionFactory === undefined) sharedNativeConnection = undefined;
			}
		});
	}

	private nativeConnectionFactoryForStore() {
		return this.nativeConnectionFactory === undefined
			? nativeConnectionFactory()
			: this.nativeConnectionFactory;
	}

	private async nativeConnection() {
		const factory = this.nativeConnectionFactoryForStore();
		if (!factory) return null;
		if (this.nativeConnectionPromise) return this.nativeConnectionPromise;
		const connection = factory();
		this.nativeConnectionPromise = connection;
		try {
			return await connection;
		} catch (error) {
			if (this.nativeConnectionPromise === connection) this.nativeConnectionPromise = undefined;
			throw error;
		}
	}

	private async readNativeState(connection: NativeAppStateConnection) {
		await this.ensureNativeState(connection);
		return this.readNativeDocument(connection);
	}

	private async ensureNativeState(connection: NativeAppStateConnection) {
		if (this.nativeInitialization) return this.nativeInitialization;
		const initialization = this.transaction(connection, async () => {
			const schemaVersion = await this.schemaVersion(connection);
			if (schemaVersion > SQLITE_SCHEMA_VERSION)
				throw new Error(`Unsupported SQLite schema version: ${schemaVersion}`);
			if (schemaVersion === 0) {
				await connection.execute(
					'CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY NOT NULL, document TEXT NOT NULL);',
					false
				);
				await connection.execute(`PRAGMA user_version = ${SQLITE_SCHEMA_VERSION};`, false);
			}
			const existing = await this.nativeDocument(connection);
			if (existing !== undefined) return;
			const document = createDefaultAppState();
			await connection.run(
				'INSERT INTO app_state (id, document) VALUES (?, ?);',
				[STATE_ID, JSON.stringify(document)],
				false
			);
		});
		this.nativeInitialization = initialization;
		try {
			await initialization;
		} catch (error) {
			if (this.nativeInitialization === initialization) this.nativeInitialization = undefined;
			throw error;
		}
	}

	private async schemaVersion(connection: NativeAppStateConnection) {
		const row = (await connection.query('PRAGMA user_version;')).values?.[0];
		const version = Number(row?.user_version);
		if (!Number.isInteger(version) || version < 0) throw new Error('Invalid SQLite schema version.');
		return version;
	}

	private async nativeDocument(connection: NativeAppStateConnection) {
		const row = (await connection.query('SELECT document FROM app_state WHERE id = ?;', [STATE_ID]))
			.values?.[0];
		if (!row) return undefined;
		if (typeof row.document !== 'string') throw new Error('Invalid SQLite app state document.');
		return row.document;
	}

	private async readNativeDocument(connection: NativeAppStateConnection) {
		const document = await this.nativeDocument(connection);
		if (document === undefined) throw new Error('SQLite app state is missing.');
		return validateLocalAppState(JSON.parse(document) as unknown);
	}

	private async ensureState() {
		const existing = await this.database.appState.get(STATE_ID);
		if (existing) return validateLocalAppState(existing.document);
		return this.serialize(() => this.createStateTransaction());
	}

	private serialize<T>(operation: () => Promise<T>) {
		const result = this.writeQueue.then(operation, operation);
		this.writeQueue = result.then(
			() => undefined,
			() => undefined
		);
		return result;
	}

	private async updateTransaction(
		mutator: (state: LocalAppState) => void | Promise<void>
	): Promise<LocalAppState> {
		const connection = await this.nativeConnection();
		if (connection) return this.persistNativeState(connection, mutator, (_, after) => after);
		return this.persistUpdatedState(mutator, (_, after) => after);
	}

	private async updateWithPreviousTransaction(
		mutator: (state: LocalAppState) => void | Promise<void>
	): Promise<{ before: LocalAppState; after: LocalAppState }> {
		const connection = await this.nativeConnection();
		if (connection)
			return this.persistNativeState(connection, mutator, (before, after) => ({ before, after }));
		return this.persistUpdatedState(mutator, (before, after) => ({ before, after }));
	}

	private async persistNativeState<T>(
		connection: NativeAppStateConnection,
		mutator: (state: LocalAppState) => void | Promise<void>,
		select: (before: LocalAppState, after: LocalAppState) => T
	) {
		await this.ensureNativeState(connection);
		return this.transaction(connection, async () => {
			const state = await this.readNativeDocument(connection);
			const before = clone(state);
			await mutator(state);
			state.updatedAt = new Date().toISOString();
			const after = validateLocalAppState(state);
			await connection.run(
				'UPDATE app_state SET document = ? WHERE id = ?;',
				[JSON.stringify(after), STATE_ID],
				false
			);
			return select(before, clone(after));
		});
	}

	private persistUpdatedState<T>(
		mutator: (state: LocalAppState) => void | Promise<void>,
		select: (before: LocalAppState, after: LocalAppState) => T
	) {
		return this.database.transaction('rw', this.database.appState, async () => {
			const row = await this.database.appState.get(STATE_ID);
			const state = validateLocalAppState(clone(row?.document ?? createDefaultAppState()));
			const before = clone(state);
			await mutator(state);
			state.updatedAt = new Date().toISOString();
			const after = validateLocalAppState(state);
			await this.database.appState.put({ id: STATE_ID, document: after });
			return select(before, clone(after));
		});
	}

	private async replaceTransaction(document: LocalAppState) {
		const connection = await this.nativeConnection();
		if (connection) {
			await this.ensureNativeState(connection);
			return this.transaction(connection, async () => {
				await connection.run(
					'UPDATE app_state SET document = ? WHERE id = ?;',
					[JSON.stringify(document), STATE_ID],
					false
				);
				return clone(document);
			});
		}
		return this.database.transaction('rw', this.database.appState, async () => {
			await this.database.appState.put({ id: STATE_ID, document: clone(document) });
			return clone(document);
		});
	}

	private createStateTransaction() {
		return this.database.transaction('rw', this.database.appState, async () => {
			const existing = await this.database.appState.get(STATE_ID);
			if (existing) return existing.document;
			const document = createDefaultAppState();
			await this.database.appState.add({ id: STATE_ID, document });
			return document;
		});
	}

	private async transaction<T>(connection: NativeAppStateConnection, operation: () => Promise<T>) {
		await connection.beginTransaction();
		try {
			const result = await operation();
			await connection.commitTransaction();
			return result;
		} catch (error) {
			try {
				await connection.rollbackTransaction();
			} catch {}
			throw error;
		}
	}
}

export function createDefaultAppState(now = new Date()): LocalAppState {
	const createdAt = now.toISOString();
	return {
		version: LOCAL_STATE_VERSION,
		updatedAt: createdAt,
		user: { id: 'local-profile', name: 'You', createdAt },
		enabledTrackerIds: defaultTrackerIds(),
		gamification: {
			startedLocalDate: localDateForInstant(now, localTimeZone()),
			awards: [],
			achievementUnlocks: []
		},
		rewards: [],
		redemptions: [],
		steps: { dailyGoal: TRACKER_DEFAULTS.steps.dailyGoal, lastReceivedAt: null, days: [] },
		sleep: { bedtime: '22:30', remindersEnabled: true, lastReceivedAt: null, days: [] },
		screenTime: {
			dailyLimitMinutes: TRACKER_DEFAULTS.screenTime.dailyLimitMinutes,
			lastReceivedAt: null,
			trackedPackages: [],
			days: []
		},
		fitness: {
			defaultSets: TRACKER_DEFAULTS.fitness.defaultSets,
			completedDays: [],
			exerciseSpeeds: {}
		},
		nutrition: { profile: null, entries: [], fastingDates: [] },
		meditation: {
			defaultDurationSeconds: TRACKER_DEFAULTS.meditation.defaultDurationSeconds,
			sessions: []
		},
		breathing: {
			rounds: TRACKER_DEFAULTS.breathing.rounds,
			includeHold: TRACKER_DEFAULTS.breathing.includeHold,
			exercises: []
		},
		stretch: {
			holdSeconds: TRACKER_DEFAULTS.stretch.holdSeconds,
			difficulties: structuredClone(TRACKER_DEFAULTS.stretch.difficulties),
			sessions: []
		},
		happiness: {
			defaultRating: TRACKER_DEFAULTS.happiness.defaultRating,
			entries: []
		},
		period: {
			defaultFlow: TRACKER_DEFAULTS.period.defaultFlow,
			fallbackCycleDays: TRACKER_DEFAULTS.period.fallbackCycleDays,
			entries: []
		}
	};
}

export function validateLocalAppState(input: unknown) {
	return stateSchema.parse(withAchievementMigration(withStretchMigration(input)));
}

function nativeConnectionFactory(): NativeAppStateConnectionFactory | null {
	if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
	return sharedNativeAppStateConnection;
}

function sharedNativeAppStateConnection() {
	if (sharedNativeConnection) return sharedNativeConnection;
	const connection = createNativeAppStateConnection();
	sharedNativeConnection = connection;
	connection.catch(() => {
		if (sharedNativeConnection === connection) sharedNativeConnection = undefined;
	});
	return connection;
}

export type NativeAppStateSQLiteConnection = {
	closeConnection(database: string, readonly: boolean): Promise<void>;
};

export type NativeAppStateSQLiteDatabaseConnection = Omit<NativeAppStateConnection, 'delete'> & {
	delete(): Promise<void>;
};

export function createNativeAppStateConnectionAdapter(
	sqlite: NativeAppStateSQLiteConnection,
	connection: NativeAppStateSQLiteDatabaseConnection
): NativeAppStateConnection {
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
				await sqlite.closeConnection(SQLITE_DATABASE_NAME, false);
			}
		}
	};
}

async function createNativeAppStateConnection(): Promise<NativeAppStateConnection> {
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
	return createNativeAppStateConnectionAdapter(sqlite, connection);
}

export const localAppStore = new LocalAppStore();

export function exportLocalAppState() {
	return localAppStore.exportState();
}

export function replaceLocalAppState(input: unknown) {
	return localAppStore.replaceState(input);
}

export const importLocalAppState = replaceLocalAppState;

function defaultTrackerIds(): AppTrackerId[] {
	return appTrackers.filter(({ defaultEnabled }) => defaultEnabled).map(({ id }) => id);
}

function withStretchMigration(input: unknown) {
	if (!input || typeof input !== 'object' || Array.isArray(input) || 'stretch' in input)
		return input;
	const state = input as Record<string, unknown>;
	const enabledTrackerIds = Array.isArray(state.enabledTrackerIds)
		? [...new Set([...state.enabledTrackerIds, 'stretch'])]
		: state.enabledTrackerIds;
	return { ...state, enabledTrackerIds };
}

function withAchievementMigration(input: unknown) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
	const state = input as Record<string, unknown>;
	if (!state.gamification || typeof state.gamification !== 'object') return input;
	const gamification = state.gamification as Record<string, unknown>;
	return {
		...state,
		gamification: {
			...gamification,
			achievementUnlocks: gamification.achievementUnlocks ?? []
		}
	};
}

function uniqueAchievementUnlocks<T extends { achievementId: string }>(unlocks: T[]) {
	const seen = new Set<string>();
	return unlocks.filter(({ achievementId }) => {
		if (seen.has(achievementId)) return false;
		seen.add(achievementId);
		return true;
	});
}

function localTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function clone<T>(value: T): T {
	return structuredClone(value);
}
