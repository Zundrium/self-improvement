import { error } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { breathingExercise } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { isValidLocalDate } from './breathing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const today = todayIso();
	const date = selectedDate(event.url, today);
	const [selectedExercises, history] = await loadExercises(requireDb(event.locals), user.id, date);
	return {
		date,
		today,
		exercise: selectedExercises[0] ?? null,
		markedDates: history.map((exercise) => exercise.localDate)
	};
};

function selectedDate(url: URL, today: string) {
	const date = url.searchParams.get('date') ?? today;
	if (!isValidLocalDate(date) || date > today) {
		error(400, 'Choose today or an earlier valid date.');
	}
	return date;
}

function loadExercises(db: ReturnType<typeof requireDb>, userId: string, date: string) {
	return db.batch([selectedExerciseQuery(db, userId, date), exerciseHistoryQuery(db, userId)]);
}

function selectedExerciseQuery(db: ReturnType<typeof requireDb>, userId: string, date: string) {
	return db
		.select()
		.from(breathingExercise)
		.where(and(eq(breathingExercise.userId, userId), eq(breathingExercise.localDate, date)))
		.limit(1);
}

function exerciseHistoryQuery(db: ReturnType<typeof requireDb>, userId: string) {
	return db
		.select({ localDate: breathingExercise.localDate })
		.from(breathingExercise)
		.where(eq(breathingExercise.userId, userId))
		.orderBy(desc(breathingExercise.localDate))
		.limit(400);
}
