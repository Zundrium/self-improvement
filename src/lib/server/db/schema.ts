import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as authSchema from './auth.schema';

export * from './auth.schema';

export const meditationSession = sqliteTable(
	'meditation_session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		localDate: text('local_date').notNull(),
		durationSeconds: integer('duration_seconds').notNull(),
		startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('meditationSession_userId_localDate_idx').on(table.userId, table.localDate),
		index('meditationSession_userId_completedAt_idx').on(table.userId, table.completedAt)
	]
);

export const meditationSessionRelations = relations(meditationSession, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [meditationSession.userId],
		references: [authSchema.user.id]
	})
}));

export const schema = { ...authSchema, meditationSession, meditationSessionRelations };
