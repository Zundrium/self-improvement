import { relations, sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import * as authSchema from '../auth.schema';

export type StoredSleepStage = {
	stage: string;
	startTime: string;
	endTime: string;
	durationSeconds: number;
};

export const sleepConnection = sqliteTable(
	'sleep_connection',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull(),
		companionTokenHash: text('companion_token_hash'),
		companionTimeZone: text('companion_time_zone'),
		timeZone: text('time_zone').notNull().default('UTC'),
		dailyGoalMinutes: integer('daily_goal_minutes').notNull().default(420),
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
		uniqueIndex('sleepConnection_tokenHash_idx').on(table.tokenHash),
		uniqueIndex('sleepConnection_companionTokenHash_idx').on(table.companionTokenHash),
		check('sleepConnection_tokenHash_check', sql`length(${table.tokenHash}) = 64`),
		check('sleepConnection_timeZone_check', sql`length(${table.timeZone}) BETWEEN 1 AND 100`),
		check(
			'sleepConnection_dailyGoalMinutes_check',
			sql`${table.dailyGoalMinutes} BETWEEN 60 AND 1440`
		),
		check(
			'sleepConnection_appVersion_check',
			sql`${table.appVersion} IS NULL OR length(${table.appVersion}) BETWEEN 1 AND 40`
		)
	]
);

export const sleepSession = sqliteTable(
	'sleep_session',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		sessionEndAt: integer('session_end_at', { mode: 'timestamp_ms' }).notNull(),
		sessionStartAt: integer('session_start_at', { mode: 'timestamp_ms' }).notNull(),
		localDate: text('local_date').notNull(),
		sessionDurationSeconds: integer('session_duration_seconds').notNull(),
		sleepDurationSeconds: integer('sleep_duration_seconds').notNull(),
		stages: text('stages', { mode: 'json' }).$type<StoredSleepStage[]>().notNull(),
		dataOrigin: text('data_origin'),
		syncedAt: integer('synced_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.sessionEndAt] }),
		index('sleepSession_userId_localDate_idx').on(table.userId, table.localDate),
		check(
			'sleepSession_date_check',
			sql`${table.localDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		),
		check(
			'sleepSession_sessionDuration_check',
			sql`${table.sessionDurationSeconds} BETWEEN 1 AND 129600`
		),
		check(
			'sleepSession_sleepDuration_check',
			sql`${table.sleepDurationSeconds} BETWEEN 0 AND ${table.sessionDurationSeconds}`
		),
		check(
			'sleepSession_interval_check',
			sql`${table.sessionStartAt} < ${table.sessionEndAt} AND ${table.sessionEndAt} - ${table.sessionStartAt} = ${table.sessionDurationSeconds} * 1000`
		),
		check(
			'sleepSession_stages_check',
			sql`json_valid(${table.stages}) AND json_type(${table.stages}) = 'array' AND json_array_length(${table.stages}) <= 200`
		),
		check(
			'sleepSession_dataOrigin_check',
			sql`${table.dataOrigin} IS NULL OR length(${table.dataOrigin}) <= 255`
		)
	]
);

export const sleepUserRelations = relations(authSchema.user, ({ many, one }) => ({
	sleepConnection: one(sleepConnection),
	sleepSessions: many(sleepSession)
}));

export const sleepConnectionRelations = relations(sleepConnection, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [sleepConnection.userId],
		references: [authSchema.user.id]
	})
}));

export const sleepSessionRelations = relations(sleepSession, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [sleepSession.userId],
		references: [authSchema.user.id]
	})
}));

export type SleepConnection = typeof sleepConnection.$inferSelect;
export type SleepSession = typeof sleepSession.$inferSelect;
