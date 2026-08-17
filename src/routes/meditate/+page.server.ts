import { error } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { meditationSession } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	if (!event.locals.db) error(503, 'Database unavailable');
	return { meditationHistory: await loadMeditationHistory(event.locals.db, user.id) };
};

async function loadMeditationHistory(db: NonNullable<App.Locals['db']>, userId: string) {
	return db
		.select({
			localDate: meditationSession.localDate,
			totalSeconds: sql<number>`sum(${meditationSession.durationSeconds})`.mapWith(Number),
			sessionCount: sql<number>`count(*)`.mapWith(Number)
		})
		.from(meditationSession)
		.where(eq(meditationSession.userId, userId))
		.groupBy(meditationSession.localDate)
		.orderBy(desc(meditationSession.localDate))
		.limit(30);
}
