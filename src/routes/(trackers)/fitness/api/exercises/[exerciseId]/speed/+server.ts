import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { fitnessExercise, fitnessExercisePreference } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { assertSameOrigin, readJson, readPositiveId } from '../../../../server/requests';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	assertSameOrigin(event.request, event.url);
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const exerciseId = readPositiveId(event.params.exerciseId);
	const speedPercent = await readSpeed(event.request);
	await requireRepExercise(db, exerciseId);
	await saveSpeed(db, user.id, exerciseId, speedPercent);
	return json({ exerciseId, speedPercent });
};

export const DELETE: RequestHandler = async (event) => {
	assertSameOrigin(event.request, event.url);
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const exerciseId = readPositiveId(event.params.exerciseId);
	await db
		.delete(fitnessExercisePreference)
		.where(
			and(
				eq(fitnessExercisePreference.userId, user.id),
				eq(fitnessExercisePreference.exerciseId, exerciseId)
			)
		);
	return json({ exerciseId, speedPercent: 100 });
};

async function requireRepExercise(db: ReturnType<typeof requireDb>, exerciseId: number) {
	const [exercise] = await db
		.select({ type: fitnessExercise.type })
		.from(fitnessExercise)
		.where(eq(fitnessExercise.id, exerciseId))
		.limit(1);
	if (!exercise) error(404, 'Exercise not found.');
	if (exercise.type !== 'reps') error(400, 'Speed is only available for rep-based exercises.');
}

async function saveSpeed(
	db: ReturnType<typeof requireDb>,
	userId: string,
	exerciseId: number,
	speedPercent: number
) {
	await db
		.insert(fitnessExercisePreference)
		.values({ userId, exerciseId, speedPercent, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: [fitnessExercisePreference.userId, fitnessExercisePreference.exerciseId],
			set: { speedPercent, updatedAt: new Date() }
		});
}

async function readSpeed(request: Request) {
	const body = await readJson(request);
	const speed =
		typeof body === 'object' && body !== null && 'speedPercent' in body
			? Number(body.speedPercent)
			: Number.NaN;
	if (!Number.isInteger(speed) || speed < 25 || speed > 200) {
		error(400, 'Speed must be a whole percentage between 25 and 200.');
	}
	return speed;
}
