import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { fitnessExercise, fitnessExercisePreference } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { readJson, readPositiveId } from '../../../../../../(trackers)/fitness/server/requests';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const exerciseId = readPositiveId(event.params.exerciseId);
	const speedPercent = await readSpeed(event.request);
	const [exercise] = await db
		.select({ type: fitnessExercise.type })
		.from(fitnessExercise)
		.where(eq(fitnessExercise.id, exerciseId))
		.limit(1);
	if (!exercise) error(404, 'Exercise not found.');
	if (exercise.type !== 'reps') error(400, 'Speed is only available for rep-based exercises.');
	await db
		.insert(fitnessExercisePreference)
		.values({ userId: user.id, exerciseId, speedPercent, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: [fitnessExercisePreference.userId, fitnessExercisePreference.exerciseId],
			set: { speedPercent, updatedAt: new Date() }
		});
	return json({ exerciseId, speedPercent });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireUser(event);
	const exerciseId = readPositiveId(event.params.exerciseId);
	await requireDb(event.locals)
		.delete(fitnessExercisePreference)
		.where(
			and(
				eq(fitnessExercisePreference.userId, user.id),
				eq(fitnessExercisePreference.exerciseId, exerciseId)
			)
		);
	return json({ exerciseId, speedPercent: 100 });
};

async function readSpeed(request: Request) {
	const body = await readJson(request);
	const speed =
		typeof body === 'object' && body && 'speedPercent' in body
			? Number(body.speedPercent)
			: Number.NaN;
	if (!Number.isInteger(speed) || speed < 25 || speed > 200) {
		error(400, 'Speed must be a whole percentage between 25 and 200.');
	}
	return speed;
}
