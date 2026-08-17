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

const PROGRAM_SLUG = 'total-body-30';

export async function getWorkoutProgram(
	db: Database,
	userId: string,
	workoutDay: number
): Promise<{ program: WorkoutProgram; completedDays: CompletedWorkoutDay[] }> {
	const [programs, rows, completedDays] = await db.batch([
		programQuery(db),
		workoutRowsQuery(db, userId, workoutDay),
		completedDaysQuery(db, userId)
	]);
	if (!programs[0]) throw new Error('The workout program has not been seeded.');
	return { program: assembleProgram(programs[0], rows), completedDays };
}

function programQuery(db: Database) {
	return db
		.select({
			id: fitnessProgram.id,
			name: fitnessProgram.name,
			description: fitnessProgram.description,
			durationDays: fitnessProgram.durationDays
		})
		.from(fitnessProgram)
		.where(eq(fitnessProgram.slug, PROGRAM_SLUG))
		.limit(1);
}

function workoutRowsQuery(db: Database, userId: string, workoutDay: number) {
	return db
		.select({
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
		.from(fitnessWorkout)
		.innerJoin(fitnessProgram, eq(fitnessWorkout.programId, fitnessProgram.id))
		.innerJoin(fitnessWorkoutExercise, eq(fitnessWorkoutExercise.workoutId, fitnessWorkout.id))
		.innerJoin(fitnessExercise, eq(fitnessExercise.id, fitnessWorkoutExercise.exerciseId))
		.leftJoin(
			fitnessExercisePreference,
			and(
				eq(fitnessExercisePreference.exerciseId, fitnessExercise.id),
				eq(fitnessExercisePreference.userId, userId)
			)
		)
		.where(and(eq(fitnessProgram.slug, PROGRAM_SLUG), eq(fitnessWorkout.day, workoutDay)))
		.orderBy(fitnessWorkoutExercise.position);
}

type Program = Awaited<ReturnType<typeof programQuery>>[number];
type ProgramRow = Awaited<ReturnType<typeof workoutRowsQuery>>[number];

function assembleProgram(program: Program, rows: ProgramRow[]): WorkoutProgram {
	const workouts = new Map<number, Workout>();
	for (const row of rows) addWorkoutRow(workouts, row);
	return { ...program, workouts: [...workouts.values()] };
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

function completedDaysQuery(db: Database, userId: string) {
	return db
		.select({
			workoutId: fitnessWorkoutProgress.workoutId,
			dateKey: fitnessWorkoutProgress.completedDate
		})
		.from(fitnessWorkoutProgress)
		.innerJoin(fitnessWorkout, eq(fitnessWorkout.id, fitnessWorkoutProgress.workoutId))
		.innerJoin(fitnessProgram, eq(fitnessProgram.id, fitnessWorkout.programId))
		.where(and(eq(fitnessWorkoutProgress.userId, userId), eq(fitnessProgram.slug, PROGRAM_SLUG)));
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
