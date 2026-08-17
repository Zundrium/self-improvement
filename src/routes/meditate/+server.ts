import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { meditationSession } from '$lib/server/db/schema';
import { isValidLocalDate, MAXIMUM_DURATION_SECONDS, MINIMUM_DURATION_SECONDS } from './meditation';
import type { RequestHandler } from './$types';

const completionSchema = z.object({
	id: z.string().uuid(),
	localDate: z.string().refine(isValidLocalDate),
	durationSeconds: z.number().int().min(MINIMUM_DURATION_SECONDS).max(MAXIMUM_DURATION_SECONDS),
	startedAt: z.number().int().positive()
});

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401, 'Authentication required');
	if (!locals.db) error(503, 'Database unavailable');
	const completion = completionSchema.safeParse(await readJson(request));
	if (!completion.success) error(400, 'Invalid meditation session');
	validateStartedAt(completion.data.startedAt);
	await saveCompletion(locals.db, locals.user.id, completion.data);
	return json(completion.data, { status: 201 });
};

async function readJson(request: Request) {
	return request.json().catch(() => error(400, 'Invalid request body'));
}

function validateStartedAt(startedAt: number) {
	const age = Date.now() - startedAt;
	if (age < -60_000 || age > 24 * 60 * 60 * 1000) error(400, 'Invalid start time');
}

async function saveCompletion(
	db: NonNullable<App.Locals['db']>,
	userId: string,
	completion: z.infer<typeof completionSchema>
) {
	await db
		.insert(meditationSession)
		.values({ ...completion, userId, startedAt: new Date(completion.startedAt) })
		.onConflictDoNothing({ target: meditationSession.id });
}
