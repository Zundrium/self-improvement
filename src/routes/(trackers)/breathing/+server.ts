import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { breathingExercise } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { BREATHING_DURATION_SECONDS, isValidLocalDate } from './breathing';
import type { RequestHandler } from './$types';

const completionSchema = z.object({
	localDate: z.string().refine(isValidLocalDate),
	startedAt: z.number().int().positive()
});

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const completion = completionSchema.safeParse(await readJson(event.request));
	if (!completion.success) error(400, 'Invalid breathing exercise');
	if (completion.data.localDate !== todayIso()) error(400, 'Only today can be completed.');
	validateStartedAt(completion.data.startedAt);
	await saveCompletion(requireDb(event.locals), user.id, completion.data);
	return json(
		{
			...completion.data,
			technique: '4-7-8' as const,
			durationSeconds: BREATHING_DURATION_SECONDS
		},
		{ status: 201 }
	);
};

async function readJson(request: Request) {
	return request.json().catch(() => error(400, 'Invalid request body'));
}

function validateStartedAt(startedAt: number) {
	const age = Date.now() - startedAt;
	if (age < -60_000 || age > 60 * 60 * 1000) error(400, 'Invalid start time');
}

function saveCompletion(
	db: ReturnType<typeof requireDb>,
	userId: string,
	completion: z.infer<typeof completionSchema>
) {
	return db
		.insert(breathingExercise)
		.values({
			...completion,
			userId,
			technique: '4-7-8',
			durationSeconds: BREATHING_DURATION_SECONDS,
			startedAt: new Date(completion.startedAt)
		})
		.onConflictDoNothing({ target: [breathingExercise.userId, breathingExercise.localDate] });
}
