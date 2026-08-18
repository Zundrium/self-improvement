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

export const stepConnection = sqliteTable(
	'step_connection',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull(),
		companionTokenHash: text('companion_token_hash'),
		companionTimeZone: text('companion_time_zone'),
		timeZone: text('time_zone').notNull().default('UTC'),
		dailyGoal: integer('daily_goal').notNull().default(5_000),
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
		uniqueIndex('stepConnection_tokenHash_idx').on(table.tokenHash),
		uniqueIndex('stepConnection_companionTokenHash_idx').on(table.companionTokenHash),
		check(
			'stepConnection_dailyGoal_check',
			sql`${table.dailyGoal} >= 1000 AND ${table.dailyGoal} <= 100000`
		)
	]
);

export const stepDailyTotal = sqliteTable(
	'step_daily_total',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		localDate: text('local_date').notNull(),
		count: integer('count').notNull(),
		sourceStartAt: integer('source_start_at', { mode: 'timestamp_ms' }).notNull(),
		sourceEndAt: integer('source_end_at', { mode: 'timestamp_ms' }).notNull(),
		syncedAt: integer('synced_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.localDate] }),
		index('stepDailyTotal_userId_localDate_idx').on(table.userId, table.localDate),
		check('stepDailyTotal_count_check', sql`${table.count} >= 0 AND ${table.count} <= 1000000`),
		check(
			'stepDailyTotal_date_check',
			sql`${table.localDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const stepUserRelations = relations(authSchema.user, ({ many, one }) => ({
	stepConnection: one(stepConnection),
	stepDailyTotals: many(stepDailyTotal)
}));

export const stepConnectionRelations = relations(stepConnection, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [stepConnection.userId],
		references: [authSchema.user.id]
	})
}));

export const stepDailyTotalRelations = relations(stepDailyTotal, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [stepDailyTotal.userId],
		references: [authSchema.user.id]
	})
}));

export type StepConnection = typeof stepConnection.$inferSelect;
export type StepDailyTotal = typeof stepDailyTotal.$inferSelect;
