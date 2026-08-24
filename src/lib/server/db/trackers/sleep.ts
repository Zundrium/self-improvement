import { relations, sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as authSchema from '../auth.schema';

export type SleepAdherenceStatus = 'pending' | 'pass' | 'fail';

export type StoredSleepUsageApp = {
	package: string;
	name: string;
	seconds: number;
};

export const sleepSettings = sqliteTable(
	'sleep_settings',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		bedtime: text('bedtime').notNull().default('22:30'),
		remindersEnabled: integer('reminders_enabled', { mode: 'boolean' }).notNull().default(false),
		timeZone: text('time_zone').notNull().default('UTC'),
		appVersion: text('app_version'),
		lastReceivedAt: integer('last_received_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		check(
			'sleepSettings_bedtime_check',
			sql`${table.bedtime} GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(${table.bedtime}, 1, 2) <= '23'`
		),
		check('sleepSettings_timeZone_check', sql`length(${table.timeZone}) BETWEEN 1 AND 100`),
		check(
			'sleepSettings_appVersion_check',
			sql`${table.appVersion} IS NULL OR length(${table.appVersion}) BETWEEN 1 AND 40`
		)
	]
);

export const sleepDailyAdherence = sqliteTable(
	'sleep_daily_adherence',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		localDate: text('local_date').notNull(),
		configuredBedtime: text('configured_bedtime').notNull(),
		windowStartAt: integer('window_start_at', { mode: 'timestamp_ms' }).notNull(),
		windowEndAt: integer('window_end_at', { mode: 'timestamp_ms' }).notNull(),
		lateUsageSeconds: integer('late_usage_seconds').notNull(),
		latestScreenActivityAt: integer('latest_screen_activity_at', { mode: 'timestamp_ms' }),
		usedApps: text('used_apps', { mode: 'json' }).$type<StoredSleepUsageApp[]>().notNull(),
		violatingApps: text('violating_apps', { mode: 'json' })
			.$type<StoredSleepUsageApp[]>()
			.notNull(),
		status: text('status').$type<SleepAdherenceStatus>().notNull(),
		sourceTimestamp: integer('source_timestamp', { mode: 'timestamp_ms' }).notNull(),
		syncedAt: integer('synced_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.localDate] }),
		index('sleepDailyAdherence_userId_localDate_idx').on(table.userId, table.localDate),
		check(
			'sleepDailyAdherence_date_check',
			sql`${table.localDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		),
		check(
			'sleepDailyAdherence_bedtime_check',
			sql`${table.configuredBedtime} GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(${table.configuredBedtime}, 1, 2) <= '23'`
		),
		check(
			'sleepDailyAdherence_window_check',
			sql`${table.windowEndAt} - ${table.windowStartAt} = 14400000`
		),
		check(
			'sleepDailyAdherence_lateUsage_check',
			sql`${table.lateUsageSeconds} BETWEEN 0 AND 1440000`
		),
		check(
			'sleepDailyAdherence_usedApps_check',
			sql`json_valid(${table.usedApps}) AND json_type(${table.usedApps}) = 'array'`
		),
		check(
			'sleepDailyAdherence_violatingApps_check',
			sql`json_valid(${table.violatingApps}) AND json_type(${table.violatingApps}) = 'array'`
		),
		check('sleepDailyAdherence_status_check', sql`${table.status} IN ('pending', 'pass', 'fail')`)
	]
);

export const sleepUserRelations = relations(authSchema.user, ({ many, one }) => ({
	sleepSettings: one(sleepSettings),
	sleepDailyAdherence: many(sleepDailyAdherence)
}));

export const sleepSettingsRelations = relations(sleepSettings, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [sleepSettings.userId],
		references: [authSchema.user.id]
	})
}));

export const sleepDailyAdherenceRelations = relations(sleepDailyAdherence, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [sleepDailyAdherence.userId],
		references: [authSchema.user.id]
	})
}));

export type SleepSettings = typeof sleepSettings.$inferSelect;
export type SleepDailyAdherence = typeof sleepDailyAdherence.$inferSelect;
