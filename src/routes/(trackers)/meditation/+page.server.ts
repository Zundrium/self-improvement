import { error } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { meditationSession } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { isValidLocalDate } from './meditation';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const today = todayIso();
	const date = selectedDate(event.url, today);
	const [markedDays, meditationHistory] = await loadMeditationHistory(
		requireDb(event.locals),
		user.id,
		date
	);
	return {
		date,
		today,
		markedDates: markedDays.map((day) => day.localDate),
		meditationHistory
	};
};

function selectedDate(url: URL, today: string) {
	const date = url.searchParams.get('date') ?? today;
	if (!isValidLocalDate(date) || date > today) {
		error(400, 'Choose today or an earlier valid date.');
	}
	return date;
}

function loadMeditationHistory(db: NonNullable<App.Locals['db']>, userId: string, date: string) {
	return db.batch([markedDaysQuery(db, userId), selectedDayQuery(db, userId, date)]);
}

function markedDaysQuery(db: NonNullable<App.Locals['db']>, userId: string) {
	return db
		.selectDistinct({ localDate: meditationSession.localDate })
		.from(meditationSession)
		.where(eq(meditationSession.userId, userId))
		.orderBy(desc(meditationSession.localDate));
}

function selectedDayQuery(db: NonNullable<App.Locals['db']>, userId: string, date: string) {
	return db
		.select({
			localDate: meditationSession.localDate,
			totalSeconds: sql<number>`sum(${meditationSession.durationSeconds})`.mapWith(Number),
			sessionCount: sql<number>`count(*)`.mapWith(Number)
		})
		.from(meditationSession)
		.where(and(eq(meditationSession.userId, userId), eq(meditationSession.localDate, date)))
		.groupBy(meditationSession.localDate);
}
