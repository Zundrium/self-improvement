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

export type ScreenTimeAppValue = {
	package: string;
	name: string;
	minutes: number;
	last_used: string;
};

export const screenTimeConnection = sqliteTable(
	'screen_time_connection',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull(),
		timeZone: text('time_zone').notNull().default('UTC'),
		appVersion: text('app_version'),
		device: text('device'),
		source: text('source'),
		lastReceivedAt: integer('last_received_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [uniqueIndex('screenTimeConnection_tokenHash_idx').on(table.tokenHash)]
);

export const screenTimeDailySnapshot = sqliteTable(
	'screen_time_daily_snapshot',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		localDate: text('local_date').notNull(),
		totalMinutes: integer('total_minutes').notNull(),
		apps: text('apps', { mode: 'json' }).$type<ScreenTimeAppValue[]>().notNull(),
		sourceTimestamp: integer('source_timestamp', { mode: 'timestamp_ms' }).notNull(),
		syncedAt: integer('synced_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.localDate] }),
		index('screenTimeDailySnapshot_userId_localDate_idx').on(table.userId, table.localDate),
		check(
			'screenTimeDailySnapshot_totalMinutes_check',
			sql`${table.totalMinutes} >= 0 AND ${table.totalMinutes} <= 1440`
		),
		check(
			'screenTimeDailySnapshot_date_check',
			sql`${table.localDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		),
		check('screenTimeDailySnapshot_apps_check', sql`json_valid(${table.apps})`)
	]
);

export const screenTimeUserRelations = relations(authSchema.user, ({ many, one }) => ({
	screenTimeConnection: one(screenTimeConnection),
	screenTimeDailySnapshots: many(screenTimeDailySnapshot)
}));

export const screenTimeConnectionRelations = relations(screenTimeConnection, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [screenTimeConnection.userId],
		references: [authSchema.user.id]
	})
}));

export const screenTimeDailySnapshotRelations = relations(screenTimeDailySnapshot, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [screenTimeDailySnapshot.userId],
		references: [authSchema.user.id]
	})
}));

export type ScreenTimeConnection = typeof screenTimeConnection.$inferSelect;
export type ScreenTimeDailySnapshot = typeof screenTimeDailySnapshot.$inferSelect;
