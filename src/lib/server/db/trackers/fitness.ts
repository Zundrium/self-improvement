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

export const fitnessProgram = sqliteTable('fitness_program', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	durationDays: integer('duration_days').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});

export const fitnessWorkout = sqliteTable(
	'fitness_workout',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		programId: integer('program_id')
			.notNull()
			.references(() => fitnessProgram.id, { onDelete: 'cascade' }),
		day: integer('day').notNull(),
		title: text('title').notNull(),
		description: text('description').notNull(),
		imageUrl: text('image_url').notNull(),
		sets: integer('sets').notNull(),
		restBetweenExercises: integer('rest_between_exercises').notNull(),
		restBetweenSets: integer('rest_between_sets').notNull()
	},
	(table) => [
		uniqueIndex('fitnessWorkout_programId_day_idx').on(table.programId, table.day),
		index('fitnessWorkout_programId_idx').on(table.programId)
	]
);

export const fitnessExercise = sqliteTable('fitness_exercise', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	type: text('type', { enum: ['reps', 'timed'] })
		.notNull()
		.default('timed'),
	imageUrl: text('image_url').notNull()
});

export const fitnessWorkoutExercise = sqliteTable(
	'fitness_workout_exercise',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		workoutId: integer('workout_id')
			.notNull()
			.references(() => fitnessWorkout.id, { onDelete: 'cascade' }),
		exerciseId: integer('exercise_id')
			.notNull()
			.references(() => fitnessExercise.id, { onDelete: 'restrict' }),
		position: integer('position').notNull(),
		amount: integer('amount').notNull()
	},
	(table) => [
		uniqueIndex('fitnessWorkoutExercise_workoutId_position_idx').on(
			table.workoutId,
			table.position
		),
		index('fitnessWorkoutExercise_workoutId_idx').on(table.workoutId),
		index('fitnessWorkoutExercise_exerciseId_idx').on(table.exerciseId),
		check('fitnessWorkoutExercise_amount_check', sql`${table.amount} > 0`)
	]
);

export const fitnessWorkoutProgress = sqliteTable(
	'fitness_workout_progress',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		workoutId: integer('workout_id')
			.notNull()
			.references(() => fitnessWorkout.id, { onDelete: 'cascade' }),
		completedDate: text('completed_date').notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.completedDate] }),
		index('fitnessWorkoutProgress_workoutId_idx').on(table.workoutId),
		check(
			'fitnessWorkoutProgress_date_check',
			sql`${table.completedDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const fitnessExercisePreference = sqliteTable(
	'fitness_exercise_preference',
	{
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		exerciseId: integer('exercise_id')
			.notNull()
			.references(() => fitnessExercise.id, { onDelete: 'cascade' }),
		speedPercent: integer('speed_percent').notNull().default(100),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.exerciseId] }),
		index('fitnessExercisePreference_exerciseId_idx').on(table.exerciseId),
		check(
			'fitnessExercisePreference_speed_check',
			sql`${table.speedPercent} >= 25 AND ${table.speedPercent} <= 200`
		)
	]
);

export const fitnessUserRelations = relations(authSchema.user, ({ many }) => ({
	fitnessProgress: many(fitnessWorkoutProgress),
	fitnessExercisePreferences: many(fitnessExercisePreference)
}));

export const fitnessProgramRelations = relations(fitnessProgram, ({ many }) => ({
	workouts: many(fitnessWorkout)
}));

export const fitnessWorkoutRelations = relations(fitnessWorkout, ({ one, many }) => ({
	program: one(fitnessProgram, {
		fields: [fitnessWorkout.programId],
		references: [fitnessProgram.id]
	}),
	exercises: many(fitnessWorkoutExercise),
	progress: many(fitnessWorkoutProgress)
}));

export const fitnessExerciseRelations = relations(fitnessExercise, ({ many }) => ({
	workouts: many(fitnessWorkoutExercise),
	preferences: many(fitnessExercisePreference)
}));

export const fitnessWorkoutExerciseRelations = relations(fitnessWorkoutExercise, ({ one }) => ({
	workout: one(fitnessWorkout, {
		fields: [fitnessWorkoutExercise.workoutId],
		references: [fitnessWorkout.id]
	}),
	exercise: one(fitnessExercise, {
		fields: [fitnessWorkoutExercise.exerciseId],
		references: [fitnessExercise.id]
	})
}));
