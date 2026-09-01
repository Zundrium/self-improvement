import { z } from 'zod';
import type { MobileSyncStatus } from '$domain/model';
import { parseStoredStatus } from '$domain/status';
import { localDateForInstant } from '$lib/trackers/dates';
import type { AppTrackerId } from '$lib/trackers/registry';
import { appTrackers } from '$lib/trackers/registry';
import {
	createNativeDatabaseConnectionAdapter,
	LocalAppDatabase,
	nativeConnectionFactory,
	relationalConnection,
	rowsSyncStatus,
	syncStatusRows,
	type NativeDatabaseConnection,
	type NativeDatabaseConnectionFactory,
	type NativeSQLiteConnectionOwner,
	type RelationalConnection
} from './database/connection';
import {
	TABLE_ORDER,
	type RelationalData,
	type RelationalRows,
	type TableName
} from './database/schema';
import { STRETCH_ACTIVITY_IDS, STRETCH_DIFFICULTIES, TRACKER_DEFAULTS } from './tracker-settings';

export { LocalAppDatabase } from './database/connection';
export type { NativeDatabaseConnection as NativeAppStateConnection } from './database/connection';
export const createNativeAppStateConnectionAdapter = createNativeDatabaseConnectionAdapter;
export type NativeAppStateConnectionFactory = NativeDatabaseConnectionFactory;
export type NativeAppStateSQLiteConnection = NativeSQLiteConnectionOwner;
export type NativeAppStateSQLiteDatabaseConnection = NativeDatabaseConnection;

export const LOCAL_STATE_VERSION = 2 as const;

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
	thumbnail: z
		.string()
		.default('')
		.transform(() => ''),
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
			'chores',
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
			.array(z.object({ achievementId: z.string().min(1), unlockedAt: instant }))
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
		dailyLimitMinutes: z.number().int().min(1).max(1_440),
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
		defaultSets: z.number().int().min(1).max(10),
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
		defaultDurationSeconds: z.number().int().min(60).max(7_200),
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
		rounds: z.number().int().min(1).max(20),
		includeHold: z.boolean(),
		exercises: z.array(
			z.object({
				localDate: date,
				technique: z.string().min(1),
				durationSeconds: z.number().int().positive(),
				startedAt: z.number().int().positive()
			})
		)
	}),
	stretch: z.object({
		holdSeconds: z.number().int().min(5).max(600),
		difficulties: z.record(z.enum(STRETCH_ACTIVITY_IDS), z.enum(STRETCH_DIFFICULTIES)),
		sessions: z.array(
			z.object({
				id: z.string().min(1),
				localDate: date,
				holdSeconds: z.number().int().min(5).max(600),
				completedAt: instant,
				hardVariationCompleted: z.boolean().optional()
			})
		)
	}),
	chores: z
		.object({
			sessions: z.array(
				z.object({
					localDate: date,
					durationSeconds: z.literal(600),
					startedAt: z.number().int().positive()
				})
			)
		})
		.default({ sessions: [] }),
	happiness: z.object({
		defaultRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
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
		defaultFlow: z.enum(['spotting', 'light', 'medium', 'heavy']),
		fallbackCycleDays: z.number().int().min(15).max(60),
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
export type LocalDomain =
	| 'profile'
	| 'steps'
	| 'sleep'
	| 'screenTime'
	| 'fitness'
	| 'nutrition'
	| 'meditation'
	| 'breathing'
	| 'stretch'
	| 'chores'
	| 'happiness'
	| 'period'
	| 'gamification'
	| 'rewards';

export const ALL_LOCAL_DOMAINS: readonly LocalDomain[] = [
	'profile',
	'steps',
	'sleep',
	'screenTime',
	'fitness',
	'nutrition',
	'meditation',
	'breathing',
	'stretch',
	'chores',
	'happiness',
	'period',
	'gamification',
	'rewards'
];

const DOMAIN_TABLES: Record<LocalDomain, readonly TableName[]> = {
	profile: ['profile', 'enabledTrackers'],
	steps: ['stepsSettings', 'stepDays'],
	sleep: ['sleepSettings', 'sleepDays', 'sleepApps'],
	screenTime: ['screenTimeSettings', 'trackedPackages', 'screenTimeDays', 'screenTimeApps'],
	fitness: ['fitnessSettings', 'fitnessExerciseSpeeds', 'fitnessCompletions'],
	nutrition: [
		'nutritionProfile',
		'nutritionEntries',
		'nutritionMedia',
		'nutritionMeals',
		'nutritionIngredients',
		'nutritionFastingDates'
	],
	meditation: ['meditationSettings', 'meditationSessions'],
	breathing: ['breathingSettings', 'breathingExercises'],
	stretch: ['stretchSettings', 'stretchDifficulties', 'stretchSessions'],
	chores: ['choresSessions'],
	happiness: ['happinessSettings', 'happinessEntries', 'happinessReasons'],
	period: ['periodSettings', 'periodEntries'],
	gamification: ['gamificationMeta', 'gamificationAwards', 'achievementUnlocks'],
	rewards: ['rewards', 'redemptions']
};

const TRACKER_SETTINGS_TABLES: Partial<Record<LocalDomain, readonly TableName[]>> = {
	steps: ['stepsSettings'],
	screenTime: ['screenTimeSettings'],
	fitness: ['fitnessSettings'],
	meditation: ['meditationSettings'],
	breathing: ['breathingSettings'],
	stretch: ['stretchSettings', 'stretchDifficulties'],
	happiness: ['happinessSettings'],
	period: ['periodSettings']
};
const PROFILE_OVERVIEW_TABLES: readonly TableName[] = [
	'profile',
	'enabledTrackers',
	'nutritionProfile',
	'rewards'
];
const DAILY_PROJECTION_OMISSIONS = new Set<TableName>([
	'sleepApps',
	'nutritionMedia',
	'nutritionMeals',
	'nutritionIngredients',
	'gamificationMeta',
	'gamificationAwards',
	'achievementUnlocks',
	'rewards',
	'redemptions',
	'nativeSyncStatus'
]);
const GAMIFICATION_PROJECTION_OMISSIONS = new Set<TableName>([
	'sleepApps',
	'nutritionIngredients',
	'nativeSyncStatus'
]);
const DAILY_PROJECTION_TABLES = TABLE_ORDER.filter(
	(table) =>
		!DAILY_PROJECTION_OMISSIONS.has(table) && table !== 'profile' && table !== 'enabledTrackers'
);
const GAMIFICATION_PROJECTION_TABLES = TABLE_ORDER.filter(
	(table) => !GAMIFICATION_PROJECTION_OMISSIONS.has(table)
);

type NutritionMediaRead = 'full' | 'reference' | 'none';

export class LocalAppStore {
	private writeQueue = Promise.resolve();
	private readonly connection: RelationalConnection;
	private initialized: Promise<void> | undefined;

	constructor(
		database = new LocalAppDatabase(),
		nativeFactory: NativeAppStateConnectionFactory | null | undefined = undefined
	) {
		this.connection = relationalConnection(
			database,
			nativeFactory === undefined ? nativeConnectionFactory() : nativeFactory
		);
	}

	read() {
		return this.readDomains(ALL_LOCAL_DOMAINS);
	}

	async readDomains(domains: readonly LocalDomain[], nutritionMedia: NutritionMediaRead = 'full') {
		await this.ensureInitialized();
		return this.readDomainsNow(domains, nutritionMedia);
	}

	readDomainsWithoutMedia(domains: readonly LocalDomain[]) {
		return this.readDomains(domains, 'none');
	}

	async readProfileOverview() {
		await this.ensureInitialized();
		return this.readProjection(['profile', 'nutrition', 'rewards'], PROFILE_OVERVIEW_TABLES);
	}

	async readTrackerSettings(domain: LocalDomain) {
		await this.ensureInitialized();
		return this.readProjection([domain], trackerSettingsTables(domain));
	}

	updateTrackerSettings(
		domain: LocalDomain,
		mutator: (state: LocalAppState) => void | Promise<void>
	) {
		return this.updateTableProjection(domain, trackerSettingsTables(domain), mutator);
	}

	updateNutritionProfile(mutator: (state: LocalAppState) => void | Promise<void>) {
		return this.updateTableProjection('nutrition', ['nutritionProfile'], mutator);
	}

	updateFitnessExerciseSpeeds(mutator: (state: LocalAppState) => void | Promise<void>) {
		return this.updateTableProjection('fitness', ['fitnessExerciseSpeeds'], mutator);
	}

	updateTrackedPackages(mutator: (state: LocalAppState) => void | Promise<void>) {
		return this.updateTableProjection('screenTime', ['trackedPackages'], mutator);
	}

	async readDailyProjection(includeProfile: boolean) {
		await this.ensureInitialized();
		const domains = includeProfile
			? (['profile', ...trackerDomains()] as LocalDomain[])
			: trackerDomains();
		const tables: readonly TableName[] = includeProfile
			? ['profile', 'enabledTrackers', ...DAILY_PROJECTION_TABLES]
			: DAILY_PROJECTION_TABLES;
		return this.readProjection(domains, tables);
	}

	update(mutator: (state: LocalAppState) => void | Promise<void>) {
		return this.updateDomains(ALL_LOCAL_DOMAINS, mutator);
	}

	updateDomains(
		domains: readonly LocalDomain[],
		mutator: (state: LocalAppState) => void | Promise<void>
	) {
		return this.serialize(() =>
			this.updateTransaction(domains, mutator, (_before, after) => after)
		);
	}

	updateWithPrevious(mutator: (state: LocalAppState) => void | Promise<void>) {
		return this.updateDomainsWithPrevious(ALL_LOCAL_DOMAINS, mutator);
	}

	updateGamificationProjection(
		writeDomains: readonly LocalDomain[],
		mutator: (state: LocalAppState) => void | Promise<void>
	) {
		return this.serialize(async () => {
			await this.ensureInitialized();
			const tables = gamificationProjectionTables(writeDomains);
			const nutritionMedia = writeDomains.includes('nutrition') ? 'full' : 'reference';
			const state = await this.readProjection(ALL_LOCAL_DOMAINS, tables, nutritionMedia);
			await mutator(state);
			state.updatedAt = new Date().toISOString();
			const valid = validateLocalAppState(state);
			await this.connection.write(stateToRelationalData(valid, writeDomains));
			return clone(valid);
		});
	}

	updateDomainsWithPrevious(
		domains: readonly LocalDomain[],
		mutator: (state: LocalAppState) => void | Promise<void>
	) {
		return this.serialize(() =>
			this.updateTransaction(domains, mutator, (before, after) => ({ before, after }))
		);
	}

	exportState() {
		return this.read();
	}

	replaceState(input: unknown) {
		const state = validateLocalAppState(input);
		return this.serialize(async () => {
			await this.ensureInitialized();
			await this.connection.write(stateToRelationalData(state, ALL_LOCAL_DOMAINS, true));
			return clone(state);
		});
	}

	loadSyncStatus() {
		return this.serialize(async () => {
			await this.ensureInitialized();
			return rowsSyncStatus((await this.connection.read(['nativeSyncStatus'])).nativeSyncStatus);
		});
	}

	saveSyncStatus(input: MobileSyncStatus) {
		const status = parseStoredStatus(input);
		return this.serialize(async () => {
			await this.ensureInitialized();
			await this.connection.write({ nativeSyncStatus: syncStatusRows(status) });
		});
	}

	async readEnabledTrackerIds() {
		const state = await this.readDomains(['profile']);
		return state.enabledTrackerIds;
	}

	deleteDatabase() {
		return this.serialize(async () => {
			await this.connection.deleteDatabase();
			this.initialized = undefined;
		});
	}

	private ensureInitialized() {
		this.initialized ??= this.connection
			.initialize(
				stateToRelationalData(createDefaultAppState(), ALL_LOCAL_DOMAINS, true) as RelationalData
			)
			.catch((error) => {
				this.initialized = undefined;
				throw error;
			});
		return this.initialized;
	}

	private async readDomainsNow(
		domains: readonly LocalDomain[],
		nutritionMedia: NutritionMediaRead = 'full'
	) {
		return this.readProjection(
			domains,
			domainTables(domains, nutritionMedia !== 'none'),
			nutritionMedia
		);
	}

	private async readProjection(
		domains: readonly LocalDomain[],
		tables: readonly TableName[],
		nutritionMedia: NutritionMediaRead = 'none'
	) {
		const data = await this.connection.read(tables, {
			loadMedia: nutritionMedia === 'full'
		});
		return validateLocalAppState(await relationalDataToState(data, domains));
	}

	private updateTableProjection(
		domain: LocalDomain,
		tables: readonly TableName[],
		mutator: (state: LocalAppState) => void | Promise<void>
	) {
		return this.serialize(async () => {
			await this.ensureInitialized();
			const state = await this.readProjection([domain], tables);
			await mutator(state);
			state.updatedAt = new Date().toISOString();
			const valid = validateLocalAppState(state);
			const domainData = stateToRelationalData(valid, [domain]);
			await this.connection.write(
				Object.fromEntries(tables.map((table) => [table, domainData[table]]))
			);
			return clone(valid);
		});
	}

	private async updateTransaction<T>(
		domains: readonly LocalDomain[],
		mutator: (state: LocalAppState) => void | Promise<void>,
		select: (before: LocalAppState, after: LocalAppState) => T
	) {
		await this.ensureInitialized();
		const before = await this.readDomainsNow(domains);
		const after = clone(before);
		await mutator(after);
		after.updatedAt = new Date().toISOString();
		const valid = validateLocalAppState(after);
		await this.connection.write(stateToRelationalData(valid, domains));
		return select(before, clone(valid));
	}

	private serialize<T>(operation: () => Promise<T>) {
		const result = this.writeQueue.then(operation, operation);
		this.writeQueue = result.then(
			() => undefined,
			() => undefined
		);
		return result;
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
		chores: { sessions: [] },
		happiness: { defaultRating: TRACKER_DEFAULTS.happiness.defaultRating, entries: [] },
		period: {
			defaultFlow: TRACKER_DEFAULTS.period.defaultFlow,
			fallbackCycleDays: TRACKER_DEFAULTS.period.fallbackCycleDays,
			entries: []
		}
	};
}

export function validateLocalAppState(input: unknown) {
	return stateSchema.parse(input);
}

export const localAppStore = new LocalAppStore();
export function exportLocalAppState() {
	return localAppStore.exportState();
}
export function replaceLocalAppState(input: unknown) {
	return localAppStore.replaceState(input);
}
export const importLocalAppState = replaceLocalAppState;

function trackerSettingsTables(domain: LocalDomain) {
	const tables = TRACKER_SETTINGS_TABLES[domain];
	if (!tables) throw new Error(`Tracker settings are unavailable for ${domain}.`);
	return tables;
}

function trackerDomains(): LocalDomain[] {
	return [
		'steps',
		'sleep',
		'screenTime',
		'fitness',
		'nutrition',
		'meditation',
		'breathing',
		'stretch',
		'chores',
		'happiness',
		'period'
	];
}

function domainTables(domains: readonly LocalDomain[], includeNutritionMedia = true) {
	const included = new Set(domains.flatMap((domain) => DOMAIN_TABLES[domain]));
	return TABLE_ORDER.filter(
		(table) => included.has(table) && (includeNutritionMedia || table !== 'nutritionMedia')
	);
}

function gamificationProjectionTables(writeDomains: readonly LocalDomain[]) {
	const required = new Set([
		...GAMIFICATION_PROJECTION_TABLES,
		...domainTables(writeDomains)
	]);
	return TABLE_ORDER.filter((table) => required.has(table));
}

function emptyRelationalData(): RelationalData {
	return Object.fromEntries(TABLE_ORDER.map((table) => [table, []])) as unknown as RelationalData;
}

function stateToRelationalData(
	state: LocalAppState,
	domains: readonly LocalDomain[],
	includeSyncDefaults = false
): Partial<RelationalData> {
	const data = emptyRelationalData();
	const selected = new Set(domains);
	if (selected.has('profile')) writeProfileRows(data, state);
	if (selected.has('steps')) writeStepsRows(data, state);
	if (selected.has('sleep')) writeSleepRows(data, state);
	if (selected.has('screenTime')) writeScreenTimeRows(data, state);
	if (selected.has('fitness')) writeFitnessRows(data, state);
	if (selected.has('nutrition')) writeNutritionRows(data, state);
	if (selected.has('meditation')) writeMeditationRows(data, state);
	if (selected.has('breathing')) writeBreathingRows(data, state);
	if (selected.has('stretch')) writeStretchRows(data, state);
	if (selected.has('chores')) writeChoresRows(data, state);
	if (selected.has('happiness')) writeHappinessRows(data, state);
	if (selected.has('period')) writePeriodRows(data, state);
	if (selected.has('gamification')) writeGamificationRows(data, state);
	if (selected.has('rewards')) writeRewardRows(data, state);
	if (includeSyncDefaults)
		data.nativeSyncStatus = syncStatusRows(
			parseStoredStatus({
				version: 2,
				trackers: {
					steps: { permission: 'unknown', outcome: 'idle' },
					sleep: { permission: 'unknown', outcome: 'idle' },
					screenTime: { permission: 'unknown', outcome: 'idle' }
				}
			})
		);
	const tables = new Set(domainTables(domains));
	if (includeSyncDefaults) tables.add('nativeSyncStatus');
	return Object.fromEntries([...tables].map((table) => [table, data[table]]));
}

function writeProfileRows(data: RelationalData, state: LocalAppState) {
	data.profile = [{ id: 1, name: state.user.name, createdAt: state.user.createdAt }];
	data.enabledTrackers = state.enabledTrackerIds.map((trackerId, position) => ({
		trackerId,
		position
	}));
}
function writeStepsRows(data: RelationalData, state: LocalAppState) {
	data.stepsSettings = [
		{ id: 1, dailyGoal: state.steps.dailyGoal, lastReceivedAt: state.steps.lastReceivedAt }
	];
	data.stepDays = state.steps.days.map((day) => ({
		localDate: day.date,
		count: day.count,
		sourceEndAt: day.sourceEndAt
	}));
}
function writeSleepRows(data: RelationalData, state: LocalAppState) {
	data.sleepSettings = [
		{
			id: 1,
			bedtime: state.sleep.bedtime,
			remindersEnabled: state.sleep.remindersEnabled,
			lastReceivedAt: state.sleep.lastReceivedAt
		}
	];
	data.sleepDays = state.sleep.days.map(
		({ usedApps: _used, violatingApps: _violating, ...day }) => day
	);
	data.sleepApps = state.sleep.days.flatMap((day) => {
		const violating = new Set(day.violatingApps.map((app) => app.package));
		return day.usedApps.map((app) => ({
			localDate: day.localDate,
			packageName: app.package,
			name: app.name,
			seconds: app.seconds,
			violating: violating.has(app.package)
		}));
	});
}
function writeScreenTimeRows(data: RelationalData, state: LocalAppState) {
	data.screenTimeSettings = [
		{
			id: 1,
			dailyLimitMinutes: state.screenTime.dailyLimitMinutes,
			lastReceivedAt: state.screenTime.lastReceivedAt
		}
	];
	data.trackedPackages = state.screenTime.trackedPackages.map((packageName) => ({ packageName }));
	data.screenTimeDays = state.screenTime.days.map(
		({ date: localDate, totalMinutes, sourceTimestamp }) => ({
			localDate,
			totalMinutes,
			sourceTimestamp
		})
	);
	data.screenTimeApps = state.screenTime.days.flatMap((day) =>
		day.apps.map((app) => ({
			localDate: day.date,
			packageName: app.package,
			name: app.name,
			minutes: app.minutes,
			lastUsedAt: app.last_used
		}))
	);
}
function writeFitnessRows(data: RelationalData, state: LocalAppState) {
	data.fitnessSettings = [{ id: 1, defaultSets: state.fitness.defaultSets }];
	data.fitnessExerciseSpeeds = Object.entries(state.fitness.exerciseSpeeds).map(
		([exerciseId, speedPercent]) => ({ exerciseId: Number(exerciseId), speedPercent })
	);
	data.fitnessCompletions = state.fitness.completedDays.map(
		({ workoutId, dateKey: localDate, completedAt }) => ({
			workoutId,
			localDate,
			completedAt: completedAt ?? null
		})
	);
}
function writeNutritionRows(data: RelationalData, state: LocalAppState) {
	data.nutritionProfile = state.nutrition.profile ? [{ id: 1, ...state.nutrition.profile }] : [];
	data.nutritionEntries = state.nutrition.entries.map((entry) => ({
		id: entry.id,
		localDate: entry.date,
		name: entry.name,
		notes: entry.notes,
		createdAt: entry.createdAt,
		calories: entry.totals.calories,
		proteinG: entry.totals.proteinG,
		carbsG: entry.totals.carbsG,
		fatG: entry.totals.fatG,
		ingredientCount: entry.totals.count
	}));
	data.nutritionMeals = state.nutrition.entries.flatMap((entry) =>
		entry.meals.map((meal, position) => ({
			id: meal.id,
			entryId: entry.id,
			position,
			name: meal.name,
			mediaId: meal.imageDataUrl ? mealMediaId(meal.id) : null,
			calories: meal.totals.calories,
			proteinG: meal.totals.proteinG,
			carbsG: meal.totals.carbsG,
			fatG: meal.totals.fatG,
			ingredientCount: meal.totals.count
		}))
	);
	data.nutritionIngredients = state.nutrition.entries.flatMap((entry) =>
		entry.meals.flatMap((meal) =>
			meal.ingredients.map((ingredient, position) => ({ ...ingredient, mealId: meal.id, position }))
		)
	);
	data.nutritionMedia = state.nutrition.entries.flatMap((entry) =>
		entry.meals.flatMap((meal) =>
			meal.imageDataUrl ? [mediaRow(meal.id, meal.imageDataUrl, entry.createdAt)] : []
		)
	);
	data.nutritionFastingDates = state.nutrition.fastingDates.map((localDate) => ({ localDate }));
}
function writeMeditationRows(data: RelationalData, state: LocalAppState) {
	data.meditationSettings = [
		{ id: 1, defaultDurationSeconds: state.meditation.defaultDurationSeconds }
	];
	data.meditationSessions = state.meditation.sessions.map((session) => ({ ...session }));
}
function writeBreathingRows(data: RelationalData, state: LocalAppState) {
	data.breathingSettings = [
		{ id: 1, rounds: state.breathing.rounds, includeHold: state.breathing.includeHold }
	];
	data.breathingExercises = state.breathing.exercises.map((exercise) => ({
		id: breathingId(exercise.localDate, exercise.startedAt),
		...exercise
	}));
}
function writeStretchRows(data: RelationalData, state: LocalAppState) {
	data.stretchSettings = [{ id: 1, holdSeconds: state.stretch.holdSeconds }];
	data.stretchDifficulties = Object.entries(state.stretch.difficulties).map(
		([activityId, difficulty]) => ({ activityId, difficulty })
	);
	data.stretchSessions = state.stretch.sessions.map((session) => ({
		...session,
		hardVariationCompleted: session.hardVariationCompleted ?? false
	}));
}
function writeChoresRows(data: RelationalData, state: LocalAppState) {
	data.choresSessions = state.chores.sessions.map((session) => ({ ...session }));
}
function writeHappinessRows(data: RelationalData, state: LocalAppState) {
	data.happinessSettings = [{ id: 1, defaultRating: state.happiness.defaultRating }];
	data.happinessEntries = state.happiness.entries.map(({ localDate, rating, updatedAt }) => ({
		localDate,
		rating,
		updatedAt
	}));
	data.happinessReasons = state.happiness.entries.flatMap((entry) =>
		entry.reasons.map((reason) => ({ localDate: entry.localDate, reason }))
	);
}
function writePeriodRows(data: RelationalData, state: LocalAppState) {
	data.periodSettings = [
		{
			id: 1,
			defaultFlow: state.period.defaultFlow,
			fallbackCycleDays: state.period.fallbackCycleDays
		}
	];
	data.periodEntries = state.period.entries.map((entry) => ({ ...entry }));
}
function writeGamificationRows(data: RelationalData, state: LocalAppState) {
	data.gamificationMeta = [{ id: 1, startedLocalDate: state.gamification.startedLocalDate }];
	data.gamificationAwards = state.gamification.awards.map((award) => ({ ...award }));
	data.achievementUnlocks = state.gamification.achievementUnlocks.map((unlock) => ({ ...unlock }));
}
function writeRewardRows(data: RelationalData, state: LocalAppState) {
	data.rewards = state.rewards.map((reward) => ({ ...reward }));
	data.redemptions = state.redemptions.map((redemption) => ({
		...redemption,
		id: redemptionId(redemption),
		rewardId: matchingRewardId(state, redemption)
	}));
}

async function relationalDataToState(
	data: Partial<RelationalData>,
	domains: readonly LocalDomain[]
) {
	const state = createDefaultAppState(profileCreatedAt(data));
	const selected = new Set(domains);
	if (selected.has('profile')) readProfileRows(state, data);
	if (selected.has('steps')) readStepsRows(state, data);
	if (selected.has('sleep')) readSleepRows(state, data);
	if (selected.has('screenTime')) readScreenTimeRows(state, data);
	if (selected.has('fitness')) readFitnessRows(state, data);
	if (selected.has('nutrition')) await readNutritionRows(state, data);
	if (selected.has('meditation')) readMeditationRows(state, data);
	if (selected.has('breathing')) readBreathingRows(state, data);
	if (selected.has('stretch')) readStretchRows(state, data);
	if (selected.has('chores')) readChoresRows(state, data);
	if (selected.has('happiness')) readHappinessRows(state, data);
	if (selected.has('period')) readPeriodRows(state, data);
	if (selected.has('gamification')) readGamificationRows(state, data);
	if (selected.has('rewards')) readRewardRows(state, data);
	return state;
}

function readProfileRows(state: LocalAppState, data: Partial<RelationalData>) {
	const profile = data.profile?.[0];
	if (profile)
		state.user = { id: 'local-profile', name: profile.name, createdAt: profile.createdAt };
	state.enabledTrackerIds = (data.enabledTrackers ?? [])
		.toSorted((a, b) => a.position - b.position)
		.map(({ trackerId }) => trackerId)
		.filter(isTrackerId);
}
function readStepsRows(state: LocalAppState, data: Partial<RelationalData>) {
	const settings = data.stepsSettings?.[0];
	state.steps.dailyGoal = settings?.dailyGoal ?? state.steps.dailyGoal;
	state.steps.lastReceivedAt = settings?.lastReceivedAt ?? null;
	state.steps.days = (data.stepDays ?? [])
		.map(({ localDate: date, count, sourceEndAt }) => ({ date, count, sourceEndAt }))
		.toSorted(byDate);
}
function readSleepRows(state: LocalAppState, data: Partial<RelationalData>) {
	const settings = data.sleepSettings?.[0];
	if (settings)
		Object.assign(state.sleep, {
			bedtime: settings.bedtime,
			remindersEnabled: settings.remindersEnabled,
			lastReceivedAt: settings.lastReceivedAt
		});
	const apps = data.sleepApps ?? [];
	state.sleep.days = (data.sleepDays ?? [])
		.map((day) => {
			const dayApps = apps.filter((app) => app.localDate === day.localDate);
			const stored = dayApps.map(({ packageName, name, seconds }) => ({
				package: packageName,
				name,
				seconds
			}));
			return {
				...day,
				status: day.status as LocalAppState['sleep']['days'][number]['status'],
				usedApps: stored,
				violatingApps: dayApps
					.filter(({ violating }) => violating)
					.map(({ packageName, name, seconds }) => ({ package: packageName, name, seconds }))
			};
		})
		.toSorted(byLocalDate);
}
function readScreenTimeRows(state: LocalAppState, data: Partial<RelationalData>) {
	const settings = data.screenTimeSettings?.[0];
	state.screenTime.dailyLimitMinutes =
		settings?.dailyLimitMinutes ?? state.screenTime.dailyLimitMinutes;
	state.screenTime.lastReceivedAt = settings?.lastReceivedAt ?? null;
	state.screenTime.trackedPackages = (data.trackedPackages ?? [])
		.map(({ packageName }) => packageName)
		.sort();
	const apps = data.screenTimeApps ?? [];
	state.screenTime.days = (data.screenTimeDays ?? [])
		.map((day) => ({
			date: day.localDate,
			totalMinutes: day.totalMinutes,
			sourceTimestamp: day.sourceTimestamp,
			apps: apps
				.filter((app) => app.localDate === day.localDate)
				.map(({ packageName, name, minutes, lastUsedAt: last_used }) => ({
					package: packageName,
					name,
					minutes,
					last_used
				}))
		}))
		.toSorted(byDate);
}
function readFitnessRows(state: LocalAppState, data: Partial<RelationalData>) {
	state.fitness.defaultSets = data.fitnessSettings?.[0]?.defaultSets ?? state.fitness.defaultSets;
	state.fitness.exerciseSpeeds = Object.fromEntries(
		(data.fitnessExerciseSpeeds ?? []).map(({ exerciseId, speedPercent }) => [
			String(exerciseId),
			speedPercent
		])
	);
	state.fitness.completedDays = (data.fitnessCompletions ?? []).map(
		({ workoutId, localDate: dateKey, completedAt }) => ({
			workoutId,
			dateKey,
			...(completedAt ? { completedAt } : {})
		})
	);
}
async function readNutritionRows(state: LocalAppState, data: Partial<RelationalData>) {
	const profile = data.nutritionProfile?.[0];
	state.nutrition.profile = profile
		? {
				...withoutId(profile),
				gender: profile.gender as NonNullable<LocalAppState['nutrition']['profile']>['gender'],
				activityLevel: profile.activityLevel as NonNullable<
					LocalAppState['nutrition']['profile']
				>['activityLevel'],
				goalMode: profile.goalMode as NonNullable<LocalAppState['nutrition']['profile']>['goalMode']
			}
		: null;
	const meals = data.nutritionMeals ?? [];
	const ingredients = data.nutritionIngredients ?? [];
	const media = new Map((data.nutritionMedia ?? []).map((item) => [item.id, item]));
	state.nutrition.entries = await Promise.all(
		(data.nutritionEntries ?? []).map(async (entry) => ({
			id: entry.id,
			date: entry.localDate,
			name: entry.name,
			notes: entry.notes,
			createdAt: entry.createdAt,
			thumbnail: '',
			totals: rowTotals(entry),
			meals: await Promise.all(
				meals
					.filter((meal) => meal.entryId === entry.id)
					.toSorted((a, b) => a.position - b.position)
					.map(async (meal) => ({
						id: meal.id,
						name: meal.name,
						imageDataUrl: await mediaDataUrl(meal.mediaId ? media.get(meal.mediaId) : undefined),
						totals: rowTotals(meal),
						ingredients: ingredients
							.filter((ingredient) => ingredient.mealId === meal.id)
							.toSorted((a, b) => a.position - b.position)
							.map(({ mealId: _mealId, position: _position, ...ingredient }) => ingredient)
					}))
			)
		}))
	);
	state.nutrition.entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	state.nutrition.fastingDates = (data.nutritionFastingDates ?? [])
		.map(({ localDate }) => localDate)
		.sort();
}
function readMeditationRows(state: LocalAppState, data: Partial<RelationalData>) {
	state.meditation.defaultDurationSeconds =
		data.meditationSettings?.[0]?.defaultDurationSeconds ?? state.meditation.defaultDurationSeconds;
	state.meditation.sessions = (data.meditationSessions ?? []).map((session) => ({ ...session }));
}
function readBreathingRows(state: LocalAppState, data: Partial<RelationalData>) {
	const settings = data.breathingSettings?.[0];
	if (settings)
		Object.assign(state.breathing, { rounds: settings.rounds, includeHold: settings.includeHold });
	state.breathing.exercises = (data.breathingExercises ?? []).map(
		({ id: _id, ...exercise }) => exercise
	);
}
function readStretchRows(state: LocalAppState, data: Partial<RelationalData>) {
	state.stretch.holdSeconds = data.stretchSettings?.[0]?.holdSeconds ?? state.stretch.holdSeconds;
	for (const row of data.stretchDifficulties ?? [])
		if (STRETCH_ACTIVITY_IDS.includes(row.activityId as (typeof STRETCH_ACTIVITY_IDS)[number]))
			state.stretch.difficulties[row.activityId as keyof typeof state.stretch.difficulties] =
				row.difficulty as never;
	state.stretch.sessions = (data.stretchSessions ?? []).map(
		({ hardVariationCompleted, ...session }) => ({
			...session,
			...(hardVariationCompleted ? { hardVariationCompleted } : {})
		})
	);
}
function readChoresRows(state: LocalAppState, data: Partial<RelationalData>) {
	state.chores.sessions = (data.choresSessions ?? []).map((session) => ({
		...session,
		durationSeconds: 600
	}));
}
function readHappinessRows(state: LocalAppState, data: Partial<RelationalData>) {
	state.happiness.defaultRating = (data.happinessSettings?.[0]?.defaultRating ??
		state.happiness.defaultRating) as LocalAppState['happiness']['defaultRating'];
	const reasons = data.happinessReasons ?? [];
	state.happiness.entries = (data.happinessEntries ?? []).map((entry) => ({
		...entry,
		rating: entry.rating as LocalAppState['happiness']['defaultRating'],
		reasons: reasons
			.filter((reason) => reason.localDate === entry.localDate)
			.map(({ reason }) => reason)
	}));
}
function readPeriodRows(state: LocalAppState, data: Partial<RelationalData>) {
	const settings = data.periodSettings?.[0];
	if (settings)
		Object.assign(state.period, {
			defaultFlow: settings.defaultFlow,
			fallbackCycleDays: settings.fallbackCycleDays
		});
	state.period.entries = (data.periodEntries ?? []).map((entry) => ({
		...entry,
		flow: entry.flow as LocalAppState['period']['defaultFlow']
	}));
}
function readGamificationRows(state: LocalAppState, data: Partial<RelationalData>) {
	state.gamification.startedLocalDate =
		data.gamificationMeta?.[0]?.startedLocalDate ?? state.gamification.startedLocalDate;
	state.gamification.awards = (data.gamificationAwards ?? []).map((award) => ({ ...award }));
	state.gamification.achievementUnlocks = (data.achievementUnlocks ?? []).map((unlock) => ({
		...unlock
	}));
}
function readRewardRows(state: LocalAppState, data: Partial<RelationalData>) {
	state.rewards = (data.rewards ?? []).map((reward) => ({ ...reward }));
	state.redemptions = (data.redemptions ?? [])
		.toSorted((a, b) => a.redeemedAt.localeCompare(b.redeemedAt))
		.map(({ id, rewardId, ...redemption }) => ({ id: rewardId ?? id, ...redemption }));
}

function rowTotals(row: {
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	ingredientCount: number;
}) {
	return {
		calories: row.calories,
		proteinG: row.proteinG,
		carbsG: row.carbsG,
		fatG: row.fatG,
		count: row.ingredientCount
	};
}
function mediaRow(
	mealId: string,
	imageDataUrl: string,
	createdAt: string
): RelationalRows['nutritionMedia'] {
	const parsed = parseDataUrl(imageDataUrl);
	return {
		id: mealMediaId(mealId),
		mimeType: parsed.type,
		byteSize: parsed.blob.size,
		relativePath: `nutrition/${mealMediaId(mealId)}-${mediaHash(imageDataUrl)}.${mediaExtension(parsed.type)}`,
		createdAt,
		blob: parsed.blob
	};
}
function parseDataUrl(value: string) {
	const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
	if (!match) return { type: 'image/jpeg', blob: new Blob([], { type: 'image/jpeg' }) };
	const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
	return { type: match[1], blob: new Blob([bytes], { type: match[1] }) };
}
async function mediaDataUrl(media: RelationalRows['nutritionMedia'] | undefined) {
	if (!media) return '';
	if (!media.blob) return `stored-media:${media.id}`;
	const bytes = new Uint8Array(await media.blob.arrayBuffer());
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return `data:${media.mimeType};base64,${btoa(binary)}`;
}
function mediaExtension(mimeType: string) {
	return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
}
function mediaHash(value: string) {
	let hash = 2_166_136_261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16_777_619);
	}
	return (hash >>> 0).toString(16);
}
function mealMediaId(mealId: string) {
	return `meal-${mealId}`;
}
function breathingId(localDate: string, startedAt: number) {
	return `${localDate}-${startedAt}`;
}
function redemptionId(redemption: LocalAppState['redemptions'][number]) {
	return `${redemption.redeemedAt}-${redemption.name}-${redemption.price}`;
}
function matchingRewardId(state: LocalAppState, redemption: LocalAppState['redemptions'][number]) {
	return state.rewards.find((reward) => reward.id === redemption.id)?.id ?? null;
}
function withoutId<T extends { id: number }>(value: T) {
	const { id: _id, ...rest } = value;
	return rest;
}
function profileCreatedAt(data: Partial<RelationalData>) {
	const value = data.profile?.[0]?.createdAt;
	return value ? new Date(value) : new Date();
}
function byDate(left: { date: string }, right: { date: string }) {
	return left.date.localeCompare(right.date);
}
function byLocalDate(left: { localDate: string }, right: { localDate: string }) {
	return left.localDate.localeCompare(right.localDate);
}
function isTrackerId(value: string): value is AppTrackerId {
	return appTrackers.some(({ id }) => id === value);
}
function defaultTrackerIds(): AppTrackerId[] {
	return appTrackers.filter(({ defaultEnabled }) => defaultEnabled).map(({ id }) => id);
}
function uniqueAchievementUnlocks<T extends { achievementId: string }>(unlocks: T[]) {
	const seen = new Set<string>();
	return unlocks.filter(
		({ achievementId }) => !seen.has(achievementId) && Boolean(seen.add(achievementId))
	);
}
function localTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
function clone<T>(value: T): T {
	return structuredClone(value);
}
