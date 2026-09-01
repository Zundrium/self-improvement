import {
	check,
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const singletonId = () => integer('id').primaryKey();
const booleanInteger = (name: string) => integer(name, { mode: 'boolean' }).notNull();

export const profile = sqliteTable(
	'profile',
	{
		id: singletonId(),
		name: text('name').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => [check('profile_singleton', sql`${table.id} = 1`)]
);
export const enabledTrackers = sqliteTable('enabled_trackers', {
	trackerId: text('tracker_id').primaryKey(),
	position: integer('position').notNull()
});
export const stepsSettings = sqliteTable(
	'steps_settings',
	{
		id: singletonId(),
		dailyGoal: integer('daily_goal').notNull(),
		lastReceivedAt: text('last_received_at')
	},
	(table) => [check('steps_settings_singleton', sql`${table.id} = 1`)]
);
export const sleepSettings = sqliteTable(
	'sleep_settings',
	{
		id: singletonId(),
		bedtime: text('bedtime').notNull(),
		remindersEnabled: booleanInteger('reminders_enabled'),
		lastReceivedAt: text('last_received_at')
	},
	(table) => [check('sleep_settings_singleton', sql`${table.id} = 1`)]
);
export const screenTimeSettings = sqliteTable(
	'screen_time_settings',
	{
		id: singletonId(),
		dailyLimitMinutes: integer('daily_limit_minutes').notNull(),
		lastReceivedAt: text('last_received_at')
	},
	(table) => [check('screen_time_settings_singleton', sql`${table.id} = 1`)]
);
export const fitnessSettings = sqliteTable(
	'fitness_settings',
	{ id: singletonId(), defaultSets: integer('default_sets').notNull() },
	(table) => [check('fitness_settings_singleton', sql`${table.id} = 1`)]
);
export const fitnessExerciseSpeeds = sqliteTable('fitness_exercise_speeds', {
	exerciseId: integer('exercise_id').primaryKey(),
	speedPercent: integer('speed_percent').notNull()
});
export const nutritionProfile = sqliteTable(
	'nutrition_profile',
	{
		id: singletonId(),
		weightKg: real('weight_kg').notNull(),
		heightCm: real('height_cm').notNull(),
		age: integer('age').notNull(),
		gender: text('gender').notNull(),
		activityLevel: text('activity_level').notNull(),
		dailyCalorieGoal: integer('daily_calorie_goal').notNull(),
		goalMode: text('goal_mode').notNull(),
		eatingWindowEnabled: booleanInteger('eating_window_enabled'),
		eatingWindowStart: text('eating_window_start').notNull(),
		eatingWindowEnd: text('eating_window_end').notNull()
	},
	(table) => [check('nutrition_profile_singleton', sql`${table.id} = 1`)]
);
export const meditationSettings = sqliteTable(
	'meditation_settings',
	{ id: singletonId(), defaultDurationSeconds: integer('default_duration_seconds').notNull() },
	(table) => [check('meditation_settings_singleton', sql`${table.id} = 1`)]
);
export const breathingSettings = sqliteTable(
	'breathing_settings',
	{
		id: singletonId(),
		rounds: integer('rounds').notNull(),
		includeHold: booleanInteger('include_hold')
	},
	(table) => [check('breathing_settings_singleton', sql`${table.id} = 1`)]
);
export const stretchSettings = sqliteTable(
	'stretch_settings',
	{ id: singletonId(), holdSeconds: integer('hold_seconds').notNull() },
	(table) => [check('stretch_settings_singleton', sql`${table.id} = 1`)]
);
export const stretchDifficulties = sqliteTable('stretch_difficulties', {
	activityId: text('activity_id').primaryKey(),
	difficulty: text('difficulty').notNull()
});
export const happinessSettings = sqliteTable(
	'happiness_settings',
	{ id: singletonId(), defaultRating: integer('default_rating').notNull() },
	(table) => [check('happiness_settings_singleton', sql`${table.id} = 1`)]
);
export const periodSettings = sqliteTable(
	'period_settings',
	{
		id: singletonId(),
		defaultFlow: text('default_flow').notNull(),
		fallbackCycleDays: integer('fallback_cycle_days').notNull()
	},
	(table) => [check('period_settings_singleton', sql`${table.id} = 1`)]
);
export const stepDays = sqliteTable(
	'step_days',
	{
		localDate: text('local_date').primaryKey(),
		count: integer('count').notNull(),
		sourceEndAt: text('source_end_at').notNull()
	},
	(table) => [index('step_days_source_end_idx').on(table.sourceEndAt)]
);
export const sleepDays = sqliteTable(
	'sleep_days',
	{
		localDate: text('local_date').primaryKey(),
		configuredBedtime: text('configured_bedtime').notNull(),
		windowStartAt: text('window_start_at'),
		windowEndAt: text('window_end_at'),
		lateUsageSeconds: integer('late_usage_seconds').notNull(),
		latestScreenActivityAt: text('latest_screen_activity_at'),
		status: text('status').notNull(),
		sourceTimestamp: text('source_timestamp')
	},
	(table) => [index('sleep_days_status_date_idx').on(table.status, table.localDate)]
);
export const sleepApps = sqliteTable(
	'sleep_apps',
	{
		localDate: text('local_date')
			.notNull()
			.references(() => sleepDays.localDate, { onDelete: 'cascade' }),
		packageName: text('package_name').notNull(),
		name: text('name').notNull(),
		seconds: integer('seconds').notNull(),
		violating: booleanInteger('violating')
	},
	(table) => [primaryKey({ columns: [table.localDate, table.packageName] })]
);
export const trackedPackages = sqliteTable('tracked_packages', {
	packageName: text('package_name').primaryKey()
});
export const screenTimeDays = sqliteTable('screen_time_days', {
	localDate: text('local_date').primaryKey(),
	totalMinutes: integer('total_minutes').notNull(),
	sourceTimestamp: text('source_timestamp').notNull()
});
export const screenTimeApps = sqliteTable(
	'screen_time_apps',
	{
		localDate: text('local_date')
			.notNull()
			.references(() => screenTimeDays.localDate, { onDelete: 'cascade' }),
		packageName: text('package_name').notNull(),
		name: text('name').notNull(),
		minutes: integer('minutes').notNull(),
		lastUsedAt: text('last_used_at').notNull()
	},
	(table) => [
		primaryKey({ columns: [table.localDate, table.packageName] }),
		index('screen_time_apps_package_date_idx').on(table.packageName, table.localDate)
	]
);
export const fitnessCompletions = sqliteTable(
	'fitness_completions',
	{
		workoutId: integer('workout_id').notNull(),
		localDate: text('local_date').notNull(),
		completedAt: text('completed_at')
	},
	(table) => [
		primaryKey({ columns: [table.workoutId, table.localDate] }),
		index('fitness_completions_date_idx').on(table.localDate)
	]
);
export const nutritionEntries = sqliteTable(
	'nutrition_entries',
	{
		id: text('id').primaryKey(),
		localDate: text('local_date').notNull(),
		name: text('name').notNull(),
		notes: text('notes').notNull(),
		createdAt: text('created_at').notNull(),
		calories: integer('calories').notNull(),
		proteinG: real('protein_g').notNull(),
		carbsG: real('carbs_g').notNull(),
		fatG: real('fat_g').notNull(),
		ingredientCount: integer('ingredient_count').notNull()
	},
	(table) => [index('nutrition_entries_date_created_idx').on(table.localDate, table.createdAt)]
);
export const nutritionMedia = sqliteTable(
	'nutrition_media',
	{
		id: text('id').primaryKey(),
		mimeType: text('mime_type').notNull(),
		byteSize: integer('byte_size').notNull(),
		relativePath: text('relative_path').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => [uniqueIndex('nutrition_media_relative_path_idx').on(table.relativePath)]
);
export const nutritionMeals = sqliteTable(
	'nutrition_meals',
	{
		id: text('id').primaryKey(),
		entryId: text('entry_id')
			.notNull()
			.references(() => nutritionEntries.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		name: text('name').notNull(),
		mediaId: text('media_id').references(() => nutritionMedia.id, { onDelete: 'set null' }),
		calories: integer('calories').notNull(),
		proteinG: real('protein_g').notNull(),
		carbsG: real('carbs_g').notNull(),
		fatG: real('fat_g').notNull(),
		ingredientCount: integer('ingredient_count').notNull()
	},
	(table) => [index('nutrition_meals_entry_position_idx').on(table.entryId, table.position)]
);
export const nutritionIngredients = sqliteTable(
	'nutrition_ingredients',
	{
		id: text('id').primaryKey(),
		mealId: text('meal_id')
			.notNull()
			.references(() => nutritionMeals.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		name: text('name').notNull(),
		quantity: real('quantity').notNull(),
		unit: text('unit').notNull(),
		calories: real('calories').notNull(),
		proteinG: real('protein_g').notNull(),
		carbsG: real('carbs_g').notNull(),
		fatG: real('fat_g').notNull(),
		notes: text('notes').notNull()
	},
	(table) => [index('nutrition_ingredients_meal_position_idx').on(table.mealId, table.position)]
);
export const nutritionFastingDates = sqliteTable('nutrition_fasting_dates', {
	localDate: text('local_date').primaryKey()
});
export const meditationSessions = sqliteTable(
	'meditation_sessions',
	{
		id: text('id').primaryKey(),
		localDate: text('local_date').notNull(),
		durationSeconds: integer('duration_seconds').notNull(),
		startedAt: integer('started_at').notNull()
	},
	(table) => [index('meditation_sessions_date_idx').on(table.localDate)]
);
export const breathingExercises = sqliteTable(
	'breathing_exercises',
	{
		id: text('id').primaryKey(),
		localDate: text('local_date').notNull(),
		technique: text('technique').notNull(),
		durationSeconds: integer('duration_seconds').notNull(),
		startedAt: integer('started_at').notNull()
	},
	(table) => [index('breathing_exercises_date_idx').on(table.localDate)]
);
export const stretchSessions = sqliteTable(
	'stretch_sessions',
	{
		id: text('id').primaryKey(),
		localDate: text('local_date').notNull(),
		holdSeconds: integer('hold_seconds').notNull(),
		completedAt: text('completed_at').notNull(),
		hardVariationCompleted: booleanInteger('hard_variation_completed')
	},
	(table) => [index('stretch_sessions_date_idx').on(table.localDate)]
);
export const choresSessions = sqliteTable(
	'chores_sessions',
	{
		localDate: text('local_date').primaryKey(),
		durationSeconds: integer('duration_seconds').notNull(),
		startedAt: integer('started_at').notNull()
	},
	(table) => [index('chores_sessions_started_idx').on(table.startedAt)]
);
export const happinessEntries = sqliteTable('happiness_entries', {
	localDate: text('local_date').primaryKey(),
	rating: integer('rating').notNull(),
	updatedAt: text('updated_at').notNull()
});
export const happinessReasons = sqliteTable(
	'happiness_reasons',
	{
		localDate: text('local_date')
			.notNull()
			.references(() => happinessEntries.localDate, { onDelete: 'cascade' }),
		reason: text('reason').notNull()
	},
	(table) => [primaryKey({ columns: [table.localDate, table.reason] })]
);
export const periodEntries = sqliteTable('period_entries', {
	localDate: text('local_date').primaryKey(),
	flow: text('flow').notNull(),
	notes: text('notes').notNull(),
	updatedAt: text('updated_at').notNull()
});
export const gamificationMeta = sqliteTable(
	'gamification_meta',
	{ id: singletonId(), startedLocalDate: text('started_local_date').notNull() },
	(table) => [check('gamification_meta_singleton', sql`${table.id} = 1`)]
);
export const gamificationAwards = sqliteTable(
	'gamification_awards',
	{
		trackerId: text('tracker_id').notNull(),
		localDate: text('local_date').notNull(),
		points: integer('points').notNull()
	},
	(table) => [
		primaryKey({ columns: [table.trackerId, table.localDate] }),
		index('awards_date_idx').on(table.localDate)
	]
);
export const achievementUnlocks = sqliteTable('achievement_unlocks', {
	achievementId: text('achievement_id').primaryKey(),
	unlockedAt: text('unlocked_at').notNull()
});
export const rewards = sqliteTable('rewards', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	emoji: text('emoji').notNull(),
	price: integer('price').notNull()
});
export const redemptions = sqliteTable(
	'redemptions',
	{
		id: text('id').primaryKey(),
		rewardId: text('reward_id').references(() => rewards.id, { onDelete: 'set null' }),
		name: text('name').notNull(),
		emoji: text('emoji').notNull(),
		price: integer('price').notNull(),
		redeemedAt: text('redeemed_at').notNull()
	},
	(table) => [index('redemptions_date_idx').on(table.redeemedAt)]
);
export const nativeSyncStatus = sqliteTable('native_sync_status', {
	trackerId: text('tracker_id').primaryKey(),
	permission: text('permission').notNull(),
	outcome: text('outcome').notNull(),
	lastAttemptAt: text('last_attempt_at'),
	lastSuccessAt: text('last_success_at'),
	failureCategory: text('failure_category'),
	failureMessage: text('failure_message'),
	failureRetryable: booleanInteger('failure_retryable')
});

export const sqliteTables = {
	profile,
	enabledTrackers,
	stepsSettings,
	sleepSettings,
	screenTimeSettings,
	fitnessSettings,
	fitnessExerciseSpeeds,
	nutritionProfile,
	meditationSettings,
	breathingSettings,
	stretchSettings,
	stretchDifficulties,
	happinessSettings,
	periodSettings,
	stepDays,
	sleepDays,
	sleepApps,
	trackedPackages,
	screenTimeDays,
	screenTimeApps,
	fitnessCompletions,
	nutritionEntries,
	nutritionMedia,
	nutritionMeals,
	nutritionIngredients,
	nutritionFastingDates,
	meditationSessions,
	breathingExercises,
	stretchSessions,
	choresSessions,
	happinessEntries,
	happinessReasons,
	periodEntries,
	gamificationMeta,
	gamificationAwards,
	achievementUnlocks,
	rewards,
	redemptions,
	nativeSyncStatus
} as const;

export type TableName = keyof typeof sqliteTables;
export type NutritionMediaRow = typeof nutritionMedia.$inferSelect & { blob?: Blob };
export type RelationalRows = {
	[K in TableName]: K extends 'nutritionMedia'
		? NutritionMediaRow
		: (typeof sqliteTables)[K]['$inferSelect'];
};
export type RelationalData = { [K in TableName]: RelationalRows[K][] };

export const TABLE_ORDER = Object.keys(sqliteTables) as TableName[];

export const TABLE_KEYS: { [K in TableName]: Array<keyof RelationalRows[K] & string> } = {
	profile: ['id'],
	enabledTrackers: ['trackerId'],
	stepsSettings: ['id'],
	sleepSettings: ['id'],
	screenTimeSettings: ['id'],
	fitnessSettings: ['id'],
	fitnessExerciseSpeeds: ['exerciseId'],
	nutritionProfile: ['id'],
	meditationSettings: ['id'],
	breathingSettings: ['id'],
	stretchSettings: ['id'],
	stretchDifficulties: ['activityId'],
	happinessSettings: ['id'],
	periodSettings: ['id'],
	stepDays: ['localDate'],
	sleepDays: ['localDate'],
	sleepApps: ['localDate', 'packageName'],
	trackedPackages: ['packageName'],
	screenTimeDays: ['localDate'],
	screenTimeApps: ['localDate', 'packageName'],
	fitnessCompletions: ['workoutId', 'localDate'],
	nutritionEntries: ['id'],
	nutritionMedia: ['id'],
	nutritionMeals: ['id'],
	nutritionIngredients: ['id'],
	nutritionFastingDates: ['localDate'],
	meditationSessions: ['id'],
	breathingExercises: ['id'],
	stretchSessions: ['id'],
	choresSessions: ['localDate'],
	happinessEntries: ['localDate'],
	happinessReasons: ['localDate', 'reason'],
	periodEntries: ['localDate'],
	gamificationMeta: ['id'],
	gamificationAwards: ['trackerId', 'localDate'],
	achievementUnlocks: ['achievementId'],
	rewards: ['id'],
	redemptions: ['id'],
	nativeSyncStatus: ['trackerId']
};

export const TABLE_COLUMNS: { [K in TableName]: Record<keyof RelationalRows[K] & string, string> } =
	{
		profile: { id: 'id', name: 'name', createdAt: 'created_at' },
		enabledTrackers: { trackerId: 'tracker_id', position: 'position' },
		stepsSettings: { id: 'id', dailyGoal: 'daily_goal', lastReceivedAt: 'last_received_at' },
		sleepSettings: {
			id: 'id',
			bedtime: 'bedtime',
			remindersEnabled: 'reminders_enabled',
			lastReceivedAt: 'last_received_at'
		},
		screenTimeSettings: {
			id: 'id',
			dailyLimitMinutes: 'daily_limit_minutes',
			lastReceivedAt: 'last_received_at'
		},
		fitnessSettings: { id: 'id', defaultSets: 'default_sets' },
		fitnessExerciseSpeeds: { exerciseId: 'exercise_id', speedPercent: 'speed_percent' },
		nutritionProfile: {
			id: 'id',
			weightKg: 'weight_kg',
			heightCm: 'height_cm',
			age: 'age',
			gender: 'gender',
			activityLevel: 'activity_level',
			dailyCalorieGoal: 'daily_calorie_goal',
			goalMode: 'goal_mode',
			eatingWindowEnabled: 'eating_window_enabled',
			eatingWindowStart: 'eating_window_start',
			eatingWindowEnd: 'eating_window_end'
		},
		meditationSettings: { id: 'id', defaultDurationSeconds: 'default_duration_seconds' },
		breathingSettings: { id: 'id', rounds: 'rounds', includeHold: 'include_hold' },
		stretchSettings: { id: 'id', holdSeconds: 'hold_seconds' },
		stretchDifficulties: { activityId: 'activity_id', difficulty: 'difficulty' },
		happinessSettings: { id: 'id', defaultRating: 'default_rating' },
		periodSettings: {
			id: 'id',
			defaultFlow: 'default_flow',
			fallbackCycleDays: 'fallback_cycle_days'
		},
		stepDays: { localDate: 'local_date', count: 'count', sourceEndAt: 'source_end_at' },
		sleepDays: {
			localDate: 'local_date',
			configuredBedtime: 'configured_bedtime',
			windowStartAt: 'window_start_at',
			windowEndAt: 'window_end_at',
			lateUsageSeconds: 'late_usage_seconds',
			latestScreenActivityAt: 'latest_screen_activity_at',
			status: 'status',
			sourceTimestamp: 'source_timestamp'
		},
		sleepApps: {
			localDate: 'local_date',
			packageName: 'package_name',
			name: 'name',
			seconds: 'seconds',
			violating: 'violating'
		},
		trackedPackages: { packageName: 'package_name' },
		screenTimeDays: {
			localDate: 'local_date',
			totalMinutes: 'total_minutes',
			sourceTimestamp: 'source_timestamp'
		},
		screenTimeApps: {
			localDate: 'local_date',
			packageName: 'package_name',
			name: 'name',
			minutes: 'minutes',
			lastUsedAt: 'last_used_at'
		},
		fitnessCompletions: {
			workoutId: 'workout_id',
			localDate: 'local_date',
			completedAt: 'completed_at'
		},
		nutritionEntries: {
			id: 'id',
			localDate: 'local_date',
			name: 'name',
			notes: 'notes',
			createdAt: 'created_at',
			calories: 'calories',
			proteinG: 'protein_g',
			carbsG: 'carbs_g',
			fatG: 'fat_g',
			ingredientCount: 'ingredient_count'
		},
		nutritionMedia: {
			id: 'id',
			mimeType: 'mime_type',
			byteSize: 'byte_size',
			relativePath: 'relative_path',
			createdAt: 'created_at',
			blob: 'blob'
		},
		nutritionMeals: {
			id: 'id',
			entryId: 'entry_id',
			position: 'position',
			name: 'name',
			mediaId: 'media_id',
			calories: 'calories',
			proteinG: 'protein_g',
			carbsG: 'carbs_g',
			fatG: 'fat_g',
			ingredientCount: 'ingredient_count'
		},
		nutritionIngredients: {
			id: 'id',
			mealId: 'meal_id',
			position: 'position',
			name: 'name',
			quantity: 'quantity',
			unit: 'unit',
			calories: 'calories',
			proteinG: 'protein_g',
			carbsG: 'carbs_g',
			fatG: 'fat_g',
			notes: 'notes'
		},
		nutritionFastingDates: { localDate: 'local_date' },
		meditationSessions: {
			id: 'id',
			localDate: 'local_date',
			durationSeconds: 'duration_seconds',
			startedAt: 'started_at'
		},
		breathingExercises: {
			id: 'id',
			localDate: 'local_date',
			technique: 'technique',
			durationSeconds: 'duration_seconds',
			startedAt: 'started_at'
		},
		stretchSessions: {
			id: 'id',
			localDate: 'local_date',
			holdSeconds: 'hold_seconds',
			completedAt: 'completed_at',
			hardVariationCompleted: 'hard_variation_completed'
		},
		choresSessions: {
			localDate: 'local_date',
			durationSeconds: 'duration_seconds',
			startedAt: 'started_at'
		},
		happinessEntries: { localDate: 'local_date', rating: 'rating', updatedAt: 'updated_at' },
		happinessReasons: { localDate: 'local_date', reason: 'reason' },
		periodEntries: {
			localDate: 'local_date',
			flow: 'flow',
			notes: 'notes',
			updatedAt: 'updated_at'
		},
		gamificationMeta: { id: 'id', startedLocalDate: 'started_local_date' },
		gamificationAwards: { trackerId: 'tracker_id', localDate: 'local_date', points: 'points' },
		achievementUnlocks: { achievementId: 'achievement_id', unlockedAt: 'unlocked_at' },
		rewards: { id: 'id', name: 'name', emoji: 'emoji', price: 'price' },
		redemptions: {
			id: 'id',
			rewardId: 'reward_id',
			name: 'name',
			emoji: 'emoji',
			price: 'price',
			redeemedAt: 'redeemed_at'
		},
		nativeSyncStatus: {
			trackerId: 'tracker_id',
			permission: 'permission',
			outcome: 'outcome',
			lastAttemptAt: 'last_attempt_at',
			lastSuccessAt: 'last_success_at',
			failureCategory: 'failure_category',
			failureMessage: 'failure_message',
			failureRetryable: 'failure_retryable'
		}
	};

export const BOOLEAN_COLUMNS: Partial<Record<TableName, string[]>> = {
	sleepSettings: ['remindersEnabled'],
	nutritionProfile: ['eatingWindowEnabled'],
	breathingSettings: ['includeHold'],
	sleepApps: ['violating'],
	stretchSessions: ['hardVariationCompleted'],
	nativeSyncStatus: ['failureRetryable']
};

export const SQLITE_SCHEMA_VERSION = 3;
export const SQLITE_DATABASE_NAME = 'self-improvement-local-v2';
export const BROWSER_DATABASE_NAME = 'self-improvement-local-v2';

export const SQLITE_SCHEMA_SQL = `
CREATE TABLE profile (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE enabled_trackers (tracker_id TEXT PRIMARY KEY NOT NULL, position INTEGER NOT NULL);
CREATE TABLE steps_settings (id INTEGER PRIMARY KEY CHECK (id = 1), daily_goal INTEGER NOT NULL, last_received_at TEXT);
CREATE TABLE sleep_settings (id INTEGER PRIMARY KEY CHECK (id = 1), bedtime TEXT NOT NULL, reminders_enabled INTEGER NOT NULL CHECK (reminders_enabled IN (0, 1)), last_received_at TEXT);
CREATE TABLE screen_time_settings (id INTEGER PRIMARY KEY CHECK (id = 1), daily_limit_minutes INTEGER NOT NULL, last_received_at TEXT);
CREATE TABLE fitness_settings (id INTEGER PRIMARY KEY CHECK (id = 1), default_sets INTEGER NOT NULL);
CREATE TABLE fitness_exercise_speeds (exercise_id INTEGER PRIMARY KEY, speed_percent INTEGER NOT NULL);
CREATE TABLE nutrition_profile (id INTEGER PRIMARY KEY CHECK (id = 1), weight_kg REAL NOT NULL, height_cm REAL NOT NULL, age INTEGER NOT NULL, gender TEXT NOT NULL, activity_level TEXT NOT NULL, daily_calorie_goal INTEGER NOT NULL, goal_mode TEXT NOT NULL, eating_window_enabled INTEGER NOT NULL CHECK (eating_window_enabled IN (0, 1)), eating_window_start TEXT NOT NULL, eating_window_end TEXT NOT NULL);
CREATE TABLE meditation_settings (id INTEGER PRIMARY KEY CHECK (id = 1), default_duration_seconds INTEGER NOT NULL);
CREATE TABLE breathing_settings (id INTEGER PRIMARY KEY CHECK (id = 1), rounds INTEGER NOT NULL, include_hold INTEGER NOT NULL CHECK (include_hold IN (0, 1)));
CREATE TABLE stretch_settings (id INTEGER PRIMARY KEY CHECK (id = 1), hold_seconds INTEGER NOT NULL);
CREATE TABLE stretch_difficulties (activity_id TEXT PRIMARY KEY, difficulty TEXT NOT NULL);
CREATE TABLE happiness_settings (id INTEGER PRIMARY KEY CHECK (id = 1), default_rating INTEGER NOT NULL);
CREATE TABLE period_settings (id INTEGER PRIMARY KEY CHECK (id = 1), default_flow TEXT NOT NULL, fallback_cycle_days INTEGER NOT NULL);
CREATE TABLE step_days (local_date TEXT PRIMARY KEY, count INTEGER NOT NULL, source_end_at TEXT NOT NULL);
CREATE INDEX step_days_source_end_idx ON step_days(source_end_at);
CREATE TABLE sleep_days (local_date TEXT PRIMARY KEY, configured_bedtime TEXT NOT NULL, window_start_at TEXT, window_end_at TEXT, late_usage_seconds INTEGER NOT NULL, latest_screen_activity_at TEXT, status TEXT NOT NULL, source_timestamp TEXT);
CREATE INDEX sleep_days_status_date_idx ON sleep_days(status, local_date DESC);
CREATE TABLE sleep_apps (local_date TEXT NOT NULL, package_name TEXT NOT NULL, name TEXT NOT NULL, seconds INTEGER NOT NULL, violating INTEGER NOT NULL CHECK (violating IN (0, 1)), PRIMARY KEY (local_date, package_name), FOREIGN KEY (local_date) REFERENCES sleep_days(local_date) ON DELETE CASCADE);
CREATE TABLE tracked_packages (package_name TEXT PRIMARY KEY);
CREATE TABLE screen_time_days (local_date TEXT PRIMARY KEY, total_minutes INTEGER NOT NULL, source_timestamp TEXT NOT NULL);
CREATE TABLE screen_time_apps (local_date TEXT NOT NULL, package_name TEXT NOT NULL, name TEXT NOT NULL, minutes INTEGER NOT NULL, last_used_at TEXT NOT NULL, PRIMARY KEY (local_date, package_name), FOREIGN KEY (local_date) REFERENCES screen_time_days(local_date) ON DELETE CASCADE);
CREATE INDEX screen_time_apps_package_date_idx ON screen_time_apps(package_name, local_date DESC);
CREATE TABLE fitness_completions (workout_id INTEGER NOT NULL, local_date TEXT NOT NULL, completed_at TEXT, PRIMARY KEY (workout_id, local_date));
CREATE INDEX fitness_completions_date_idx ON fitness_completions(local_date DESC);
CREATE TABLE nutrition_entries (id TEXT PRIMARY KEY, local_date TEXT NOT NULL, name TEXT NOT NULL, notes TEXT NOT NULL, created_at TEXT NOT NULL, calories INTEGER NOT NULL, protein_g REAL NOT NULL, carbs_g REAL NOT NULL, fat_g REAL NOT NULL, ingredient_count INTEGER NOT NULL);
CREATE TABLE nutrition_media (id TEXT PRIMARY KEY, mime_type TEXT NOT NULL, byte_size INTEGER NOT NULL, relative_path TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
CREATE TABLE nutrition_meals (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, position INTEGER NOT NULL, name TEXT NOT NULL, media_id TEXT, calories INTEGER NOT NULL, protein_g REAL NOT NULL, carbs_g REAL NOT NULL, fat_g REAL NOT NULL, ingredient_count INTEGER NOT NULL, FOREIGN KEY (entry_id) REFERENCES nutrition_entries(id) ON DELETE CASCADE, FOREIGN KEY (media_id) REFERENCES nutrition_media(id) ON DELETE SET NULL);
CREATE TABLE nutrition_ingredients (id TEXT PRIMARY KEY, meal_id TEXT NOT NULL, position INTEGER NOT NULL, name TEXT NOT NULL, quantity REAL NOT NULL, unit TEXT NOT NULL, calories REAL NOT NULL, protein_g REAL NOT NULL, carbs_g REAL NOT NULL, fat_g REAL NOT NULL, notes TEXT NOT NULL, FOREIGN KEY (meal_id) REFERENCES nutrition_meals(id) ON DELETE CASCADE);
CREATE TABLE nutrition_fasting_dates (local_date TEXT PRIMARY KEY);
CREATE INDEX nutrition_entries_date_created_idx ON nutrition_entries(local_date DESC, created_at DESC);
CREATE INDEX nutrition_meals_entry_position_idx ON nutrition_meals(entry_id, position);
CREATE INDEX nutrition_ingredients_meal_position_idx ON nutrition_ingredients(meal_id, position);
CREATE TABLE meditation_sessions (id TEXT PRIMARY KEY, local_date TEXT NOT NULL, duration_seconds INTEGER NOT NULL, started_at INTEGER NOT NULL);
CREATE INDEX meditation_sessions_date_idx ON meditation_sessions(local_date DESC);
CREATE TABLE breathing_exercises (id TEXT PRIMARY KEY, local_date TEXT NOT NULL, technique TEXT NOT NULL, duration_seconds INTEGER NOT NULL, started_at INTEGER NOT NULL);
CREATE INDEX breathing_exercises_date_idx ON breathing_exercises(local_date DESC);
CREATE TABLE stretch_sessions (id TEXT PRIMARY KEY, local_date TEXT NOT NULL, hold_seconds INTEGER NOT NULL, completed_at TEXT NOT NULL, hard_variation_completed INTEGER NOT NULL DEFAULT 0 CHECK (hard_variation_completed IN (0, 1)));
CREATE INDEX stretch_sessions_date_idx ON stretch_sessions(local_date DESC);
CREATE TABLE chores_sessions (local_date TEXT PRIMARY KEY, duration_seconds INTEGER NOT NULL, started_at INTEGER NOT NULL);
CREATE INDEX chores_sessions_started_idx ON chores_sessions(started_at DESC);
CREATE TABLE happiness_entries (local_date TEXT PRIMARY KEY, rating INTEGER NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE happiness_reasons (local_date TEXT NOT NULL, reason TEXT NOT NULL, PRIMARY KEY (local_date, reason), FOREIGN KEY (local_date) REFERENCES happiness_entries(local_date) ON DELETE CASCADE);
CREATE TABLE period_entries (local_date TEXT PRIMARY KEY, flow TEXT NOT NULL, notes TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE gamification_meta (id INTEGER PRIMARY KEY CHECK (id = 1), started_local_date TEXT NOT NULL);
CREATE TABLE gamification_awards (tracker_id TEXT NOT NULL, local_date TEXT NOT NULL, points INTEGER NOT NULL, PRIMARY KEY (tracker_id, local_date));
CREATE INDEX awards_date_idx ON gamification_awards(local_date DESC);
CREATE TABLE achievement_unlocks (achievement_id TEXT PRIMARY KEY, unlocked_at TEXT NOT NULL);
CREATE TABLE rewards (id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT NOT NULL, price INTEGER NOT NULL);
CREATE TABLE redemptions (id TEXT PRIMARY KEY, reward_id TEXT, name TEXT NOT NULL, emoji TEXT NOT NULL, price INTEGER NOT NULL, redeemed_at TEXT NOT NULL, FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE SET NULL);
CREATE INDEX redemptions_date_idx ON redemptions(redeemed_at DESC);
CREATE TABLE native_sync_status (tracker_id TEXT PRIMARY KEY, permission TEXT NOT NULL, outcome TEXT NOT NULL, last_attempt_at TEXT, last_success_at TEXT, failure_category TEXT, failure_message TEXT, failure_retryable INTEGER NOT NULL DEFAULT 1 CHECK (failure_retryable IN (0, 1)));
PRAGMA user_version = 3;
`;

export const SQLITE_V2_TO_V3_SQL = `
CREATE TABLE chores_sessions (local_date TEXT PRIMARY KEY, duration_seconds INTEGER NOT NULL, started_at INTEGER NOT NULL);
CREATE INDEX chores_sessions_started_idx ON chores_sessions(started_at DESC);
INSERT OR IGNORE INTO enabled_trackers (tracker_id, position)
VALUES ('chores', COALESCE((SELECT MAX(position) + 1 FROM enabled_trackers), 0));
PRAGMA user_version = 3;
`;

export const DEXIE_STORES: Record<TableName, string> = {
	profile: 'id',
	enabledTrackers: 'trackerId, position',
	stepsSettings: 'id',
	sleepSettings: 'id',
	screenTimeSettings: 'id',
	fitnessSettings: 'id',
	fitnessExerciseSpeeds: 'exerciseId',
	nutritionProfile: 'id',
	meditationSettings: 'id',
	breathingSettings: 'id',
	stretchSettings: 'id',
	stretchDifficulties: 'activityId',
	happinessSettings: 'id',
	periodSettings: 'id',
	stepDays: 'localDate, sourceEndAt',
	sleepDays: 'localDate, [status+localDate]',
	sleepApps: '[localDate+packageName], localDate',
	trackedPackages: 'packageName',
	screenTimeDays: 'localDate',
	screenTimeApps: '[localDate+packageName], [packageName+localDate], localDate',
	fitnessCompletions: '[workoutId+localDate], localDate',
	nutritionEntries: 'id, [localDate+createdAt], localDate',
	nutritionMedia: 'id, &relativePath',
	nutritionMeals: 'id, [entryId+position], entryId, mediaId',
	nutritionIngredients: 'id, [mealId+position], mealId',
	nutritionFastingDates: 'localDate',
	meditationSessions: 'id, localDate',
	breathingExercises: 'id, localDate',
	stretchSessions: 'id, localDate',
	choresSessions: 'localDate, startedAt',
	happinessEntries: 'localDate',
	happinessReasons: '[localDate+reason], localDate',
	periodEntries: 'localDate',
	gamificationMeta: 'id',
	gamificationAwards: '[trackerId+localDate], localDate',
	achievementUnlocks: 'achievementId, unlockedAt',
	rewards: 'id, price',
	redemptions: 'id, redeemedAt, rewardId',
	nativeSyncStatus: 'trackerId'
};
