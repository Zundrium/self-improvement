import { relations, sql } from 'drizzle-orm';
import { check, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as authSchema from '../auth.schema';

export const breathingExercise = sqliteTable(
	'breathing_exercise',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		localDate: text('local_date').notNull(),
		technique: text('technique', { enum: ['4-7-8', '4-8'] })
			.notNull()
			.default('4-7-8'),
		durationSeconds: integer('duration_seconds').notNull(),
		startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.localDate] }),
		check('breathingExercise_duration_check', sql`${table.durationSeconds} IN (72, 114)`),
		check(
			'breathingExercise_date_check',
			sql`${table.localDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const breathingExerciseRelations = relations(breathingExercise, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [breathingExercise.userId],
		references: [authSchema.user.id]
	})
}));

export type BreathingExercise = typeof breathingExercise.$inferSelect;
