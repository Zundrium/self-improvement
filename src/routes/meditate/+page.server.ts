import { error } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { meditationSession } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { isValidLocalDate } from './meditation';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const today = todayIso();
	const date = selectedDate(event.url, today);
	return {
		date,
		today,
		meditationHistory: await loadMeditationHistory(requireDb(event.locals), user.id)
	};
};

function selectedDate(url: URL, today: string) {
	const date = url.searchParams.get('date') ?? today;
	if (!isValidLocalDate(date) || date > today) {
		error(400, 'Choose today or an earlier valid date.');
	}
	return date;
}

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
		.orderBy(desc(meditationSession.localDate));
}
