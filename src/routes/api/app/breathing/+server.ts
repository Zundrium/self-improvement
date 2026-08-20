import { and, desc, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { breathingExercise } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import {
	breathingDurationSeconds,
	isValidLocalDate
} from '../../../(trackers)/breathing/breathing';
import type { RequestHandler } from './$types';

const completionSchema = z.object({
	localDate: z.string().refine(isValidLocalDate),
	startedAt: z.number().int().positive(),
	includeHold: z.boolean()
});

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const today = todayIso();
	const date = selectedDate(event.url.searchParams.get('date'), today);
	const [selected, history] = await db.batch([
		db
			.select()
			.from(breathingExercise)
			.where(and(eq(breathingExercise.userId, user.id), eq(breathingExercise.localDate, date)))
			.limit(1),
		db
			.select({ localDate: breathingExercise.localDate })
			.from(breathingExercise)
			.where(eq(breathingExercise.userId, user.id))
			.orderBy(desc(breathingExercise.localDate))
			.limit(400)
	]);
	return json({
		date,
		today,
		exercise: selected[0] ?? null,
		markedDates: history.map((day) => day.localDate)
	});
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const completion = completionSchema.safeParse(await event.request.json().catch(() => null));
	if (!completion.success) error(400, 'Invalid breathing exercise.');
	if (completion.data.localDate !== todayIso()) error(400, 'Only today can be completed.');
	const age = Date.now() - completion.data.startedAt;
	if (age < -60_000 || age > 60 * 60 * 1000) error(400, 'Invalid start time.');
	const { includeHold, ...exercise } = completion.data;
	const technique = includeHold ? '4-7-8' : '4-8';
	const durationSeconds = breathingDurationSeconds(includeHold);
	await requireDb(event.locals)
		.insert(breathingExercise)
		.values({
			...exercise,
			userId: user.id,
			technique,
			durationSeconds,
			startedAt: new Date(exercise.startedAt)
		})
		.onConflictDoNothing({ target: [breathingExercise.userId, breathingExercise.localDate] });
	return json(
		{
			...completion.data,
			technique,
			durationSeconds
		},
		{ status: 201 }
	);
};

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidLocalDate(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}
