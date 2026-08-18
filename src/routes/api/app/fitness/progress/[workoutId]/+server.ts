import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { fitnessWorkout, fitnessWorkoutProgress } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import {
	dateMatchesWorkoutDay,
	isValidCompletionDate
} from '../../../../../(trackers)/fitness/fitness';
import { readJson, readPositiveId } from '../../../../../(trackers)/fitness/server/requests';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const workoutId = readPositiveId(event.params.workoutId);
	const completedDate = await readCompletedDate(event.request);
	const workoutDay = await findWorkoutDay(db, workoutId);
	if (!dateMatchesWorkoutDay(completedDate, workoutDay)) {
		error(400, 'The completion date does not match the workout day.');
	}
	await db
		.insert(fitnessWorkoutProgress)
		.values({ userId: user.id, workoutId, completedDate, completedAt: new Date() })
		.onConflictDoUpdate({
			target: [fitnessWorkoutProgress.userId, fitnessWorkoutProgress.completedDate],
			set: { workoutId, completedAt: new Date() }
		});
	return json({ completed: true, completedDate });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const workoutId = readPositiveId(event.params.workoutId);
	const completedDate = validateDate(event.url.searchParams.get('date'));
	await db
		.delete(fitnessWorkoutProgress)
		.where(
			and(
				eq(fitnessWorkoutProgress.userId, user.id),
				eq(fitnessWorkoutProgress.workoutId, workoutId),
				eq(fitnessWorkoutProgress.completedDate, completedDate)
			)
		);
	return json({ completed: false, completedDate });
};

async function findWorkoutDay(db: ReturnType<typeof requireDb>, workoutId: number) {
	const [workout] = await db
		.select({ day: fitnessWorkout.day })
		.from(fitnessWorkout)
		.where(eq(fitnessWorkout.id, workoutId))
		.limit(1);
	if (!workout) error(404, 'Workout not found.');
	return workout.day;
}

async function readCompletedDate(request: Request) {
	const body = await readJson(request);
	const value =
		typeof body === 'object' && body && 'completedDate' in body ? body.completedDate : null;
	return validateDate(value);
}

function validateDate(value: unknown) {
	if (!isValidCompletionDate(value)) error(400, 'Expected a valid date in YYYY-MM-DD format.');
	return value as string;
}
