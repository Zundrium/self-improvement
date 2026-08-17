export type ExerciseType = 'reps' | 'timed';

interface WorkoutActivityBase {
	id: number;
	exerciseId: number;
	slug: string;
	name: string;
	imageUrl: string;
	amount: number;
}

export interface RepWorkoutActivity extends WorkoutActivityBase {
	type: 'reps';
	speedPercent: number;
}

export interface TimedWorkoutActivity extends WorkoutActivityBase {
	type: 'timed';
}

export type WorkoutActivity = RepWorkoutActivity | TimedWorkoutActivity;

export interface Workout {
	id: number;
	day: number;
	title: string;
	description: string;
	imageUrl: string;
	sets: number;
	restBetweenExercises: number;
	restBetweenSets: number;
	activities: WorkoutActivity[];
}

export interface WorkoutProgram {
	id: number;
	name: string;
	description: string;
	durationDays: number;
	workouts: Workout[];
}

export interface CompletedWorkoutDay {
	workoutId: number;
	dateKey: string;
}

export interface ExercisePreference {
	id: number;
	slug: string;
	name: string;
	type: 'reps';
	imageUrl: string;
	speedPercent: number;
	workoutCount: number;
}

export function isValidCompletionDate(value: unknown) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const parsed = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dateMatchesWorkoutDay(date: string, workoutDay: number) {
	return Number(date.slice(-2)) === workoutDay;
}
