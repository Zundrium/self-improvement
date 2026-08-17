import { and, countDistinct, eq } from 'drizzle-orm';
import {
	fitnessExercise,
	fitnessExercisePreference,
	fitnessProgram,
	fitnessWorkout,
	fitnessWorkoutExercise,
	fitnessWorkoutProgress
} from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';
import type { CompletedWorkoutDay, ExercisePreference, Workout, WorkoutProgram } from '../fitness';

export async function getWorkoutProgram(
	db: Database,
	userId: string
): Promise<{ program: WorkoutProgram; completedDays: CompletedWorkoutDay[] }> {
	const rows = await loadProgramRows(db, userId);
	if (!rows[0]) throw new Error('The workout program has not been seeded.');
	return {
		program: assembleProgram(rows),
		completedDays: await loadCompletedDays(db, userId, rows[0].programId)
	};
}

async function loadProgramRows(db: Database, userId: string) {
	return db
		.select({
			programId: fitnessProgram.id,
			programName: fitnessProgram.name,
			programDescription: fitnessProgram.description,
			durationDays: fitnessProgram.durationDays,
			workoutId: fitnessWorkout.id,
			day: fitnessWorkout.day,
			title: fitnessWorkout.title,
			description: fitnessWorkout.description,
			workoutImageUrl: fitnessWorkout.imageUrl,
			sets: fitnessWorkout.sets,
			restBetweenExercises: fitnessWorkout.restBetweenExercises,
			restBetweenSets: fitnessWorkout.restBetweenSets,
			workoutExerciseId: fitnessWorkoutExercise.id,
			position: fitnessWorkoutExercise.position,
			amount: fitnessWorkoutExercise.amount,
			exerciseId: fitnessExercise.id,
			exerciseSlug: fitnessExercise.slug,
			exerciseType: fitnessExercise.type,
			exerciseName: fitnessExercise.name,
			exerciseImageUrl: fitnessExercise.imageUrl,
			speedPercent: fitnessExercisePreference.speedPercent
		})
		.from(fitnessProgram)
		.innerJoin(fitnessWorkout, eq(fitnessWorkout.programId, fitnessProgram.id))
		.innerJoin(fitnessWorkoutExercise, eq(fitnessWorkoutExercise.workoutId, fitnessWorkout.id))
		.innerJoin(fitnessExercise, eq(fitnessExercise.id, fitnessWorkoutExercise.exerciseId))
		.leftJoin(
			fitnessExercisePreference,
			and(
				eq(fitnessExercisePreference.exerciseId, fitnessExercise.id),
				eq(fitnessExercisePreference.userId, userId)
			)
		)
		.where(eq(fitnessProgram.slug, 'total-body-30'))
		.orderBy(fitnessWorkout.day, fitnessWorkoutExercise.position);
}

type ProgramRow = Awaited<ReturnType<typeof loadProgramRows>>[number];

function assembleProgram(rows: ProgramRow[]): WorkoutProgram {
	const workouts = new Map<number, Workout>();
	for (const row of rows) addWorkoutRow(workouts, row);
	return {
		id: rows[0].programId,
		name: rows[0].programName,
		description: rows[0].programDescription,
		durationDays: rows[0].durationDays,
		workouts: [...workouts.values()]
	};
}

function addWorkoutRow(workouts: Map<number, Workout>, row: ProgramRow) {
	const workout = workouts.get(row.workoutId) ?? createWorkout(row);
	if (!workouts.has(row.workoutId)) workouts.set(row.workoutId, workout);
	const activity = createActivity(row);
	workout.activities.push(activity);
}

function createWorkout(row: ProgramRow): Workout {
	return {
		id: row.workoutId,
		day: row.day,
		title: row.title,
		description: row.description,
		imageUrl: row.workoutImageUrl,
		sets: row.sets,
		restBetweenExercises: row.restBetweenExercises,
		restBetweenSets: row.restBetweenSets,
		activities: []
	};
}

function createActivity(row: ProgramRow) {
	const activity = {
		id: row.workoutExerciseId,
		exerciseId: row.exerciseId,
		slug: row.exerciseSlug,
		name: row.exerciseName,
		imageUrl: row.exerciseImageUrl,
		amount: row.amount
	};
	return row.exerciseType === 'reps'
		? { ...activity, type: 'reps' as const, speedPercent: row.speedPercent ?? 100 }
		: { ...activity, type: 'timed' as const };
}

async function loadCompletedDays(db: Database, userId: string, programId: number) {
	return db
		.select({
			workoutId: fitnessWorkoutProgress.workoutId,
			dateKey: fitnessWorkoutProgress.completedDate
		})
		.from(fitnessWorkoutProgress)
		.innerJoin(fitnessWorkout, eq(fitnessWorkout.id, fitnessWorkoutProgress.workoutId))
		.where(and(eq(fitnessWorkoutProgress.userId, userId), eq(fitnessWorkout.programId, programId)));
}

export async function getExercisePreferences(
	db: Database,
	userId: string
): Promise<ExercisePreference[]> {
	const rows = await db
		.select({
			id: fitnessExercise.id,
			slug: fitnessExercise.slug,
			name: fitnessExercise.name,
			type: fitnessExercise.type,
			imageUrl: fitnessExercise.imageUrl,
			speedPercent: fitnessExercisePreference.speedPercent,
			workoutCount: countDistinct(fitnessWorkoutExercise.workoutId)
		})
		.from(fitnessExercise)
		.leftJoin(fitnessWorkoutExercise, eq(fitnessWorkoutExercise.exerciseId, fitnessExercise.id))
		.leftJoin(
			fitnessExercisePreference,
			and(
				eq(fitnessExercisePreference.exerciseId, fitnessExercise.id),
				eq(fitnessExercisePreference.userId, userId)
			)
		)
		.where(eq(fitnessExercise.type, 'reps'))
		.groupBy(fitnessExercise.id)
		.orderBy(fitnessExercise.name);

	return rows.map((row) => ({
		id: row.id,
		slug: row.slug,
		name: row.name,
		type: 'reps',
		imageUrl: row.imageUrl,
		speedPercent: row.speedPercent ?? 100,
		workoutCount: row.workoutCount
	}));
}
