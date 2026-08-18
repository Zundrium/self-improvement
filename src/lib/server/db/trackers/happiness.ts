import { relations, sql } from 'drizzle-orm';
import { check, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as authSchema from '../auth.schema';

export const happinessEntry = sqliteTable(
	'happiness_entry',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		localDate: text('local_date').notNull(),
		rating: integer('rating').$type<1 | 2 | 3 | 4 | 5>().notNull(),
		reasons: text('reasons', { mode: 'json' }).$type<string[]>().notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.localDate] }),
		check('happinessEntry_rating_check', sql`${table.rating} BETWEEN 1 AND 5`),
		check(
			'happinessEntry_date_check',
			sql`${table.localDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const happinessEntryRelations = relations(happinessEntry, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [happinessEntry.userId],
		references: [authSchema.user.id]
	})
}));

export type HappinessEntry = typeof happinessEntry.$inferSelect;
