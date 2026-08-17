import { relations, sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as authSchema from './auth.schema';

export const trackerPreference = sqliteTable(
	'tracker_preference',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		trackerId: text('tracker_id').notNull(),
		enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [primaryKey({ columns: [table.userId, table.trackerId] })]
);

export const trackerPreferenceRelations = relations(trackerPreference, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [trackerPreference.userId],
		references: [authSchema.user.id]
	})
}));
