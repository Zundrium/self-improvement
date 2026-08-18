import { and, desc, eq, sql } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { meditationSession } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import {
	isValidLocalDate,
	MAXIMUM_DURATION_SECONDS,
	MINIMUM_DURATION_SECONDS
} from '../../../(trackers)/meditation/meditation';
import type { RequestHandler } from './$types';

const completionSchema = z.object({
	id: z.string().uuid(),
	localDate: z.string().refine(isValidLocalDate),
	durationSeconds: z.number().int().min(MINIMUM_DURATION_SECONDS).max(MAXIMUM_DURATION_SECONDS),
	startedAt: z.number().int().positive()
});

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	const today = todayIso();
	const date = selectedDate(event.url.searchParams.get('date'), today);
	const [markedDays, meditationHistory] = await db.batch([
		db
			.selectDistinct({ localDate: meditationSession.localDate })
			.from(meditationSession)
			.where(eq(meditationSession.userId, user.id))
			.orderBy(desc(meditationSession.localDate)),
		db
			.select({
				localDate: meditationSession.localDate,
				totalSeconds: sql<number>`sum(${meditationSession.durationSeconds})`.mapWith(Number),
				sessionCount: sql<number>`count(*)`.mapWith(Number)
			})
			.from(meditationSession)
			.where(and(eq(meditationSession.userId, user.id), eq(meditationSession.localDate, date)))
			.groupBy(meditationSession.localDate)
	]);
	return json({
		date,
		today,
		markedDates: markedDays.map((day) => day.localDate),
		meditationHistory
	});
};

export const POST: RequestHandler = async (event) => {
	const user = requireUser(event);
	const completion = completionSchema.safeParse(await event.request.json().catch(() => null));
	if (!completion.success) error(400, 'Invalid meditation session.');
	const age = Date.now() - completion.data.startedAt;
	if (age < -60_000 || age > 24 * 60 * 60 * 1000) error(400, 'Invalid start time.');
	await requireDb(event.locals)
		.insert(meditationSession)
		.values({ ...completion.data, userId: user.id, startedAt: new Date(completion.data.startedAt) })
		.onConflictDoNothing({ target: meditationSession.id });
	return json(completion.data, { status: 201 });
};

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidLocalDate(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}
