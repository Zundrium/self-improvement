import { relations, sql } from 'drizzle-orm';
import { check, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as authSchema from '../auth.schema';

export const menstruationEntry = sqliteTable(
	'menstruation_entry',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		localDate: text('local_date').notNull(),
		flow: text('flow', { enum: ['spotting', 'light', 'medium', 'heavy'] }).notNull(),
		notes: text('notes').notNull().default(''),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.localDate] }),
		check(
			'menstruationEntry_date_check',
			sql`${table.localDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const menstruationEntryRelations = relations(menstruationEntry, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [menstruationEntry.userId],
		references: [authSchema.user.id]
	})
}));

export type MenstruationEntry = typeof menstruationEntry.$inferSelect;
