import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

import {
	fitnessProgram,
	fitnessWorkout,
	fitnessWorkoutProgress,
	meditationSession
} from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { getDailyEntries, sumEntryTotals, validDate } from './calories/server/nutrition';
import { getProfile } from './calories/server/profiles';
import { getDailySteps, getStepConnection } from './steps/server/steps';
import { localDateForInstant } from './steps/steps';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const requestedDate = event.url.searchParams.get('date');
	return { dashboard: await loadDashboard(requireDb(event.locals), user.id, requestedDate) };
};

async function loadDashboard(
	db: ReturnType<typeof requireDb>,
	userId: string,
	requestedDate: string | null
) {
	const connection = await getStepConnection(db, userId);
	const today = localDateForInstant(new Date(), connection?.timeZone ?? 'UTC');
	const date = requestedDate ?? today;
	if (!validDate(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	const [steps, fitness, nutrition, meditationDone] = await Promise.all([
		loadSteps(db, userId, date),
		loadFitness(db, userId, date),
		loadNutrition(db, userId, date),
		loadMeditationDone(db, userId, date)
	]);
	return {
		date,
		today,
		steps,
		stepGoal: connection?.dailyGoal ?? 10_000,
		...fitness,
		...nutrition,
		meditationDone
	};
}

async function loadSteps(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const totals = await getDailySteps(db, userId, today, today);
	return totals[0]?.count ?? 0;
}

async function loadFitness(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const [workout] = await db
		.select({
			title: fitnessWorkout.title,
			completedDate: fitnessWorkoutProgress.completedDate
		})
		.from(fitnessWorkout)
		.innerJoin(fitnessProgram, eq(fitnessProgram.id, fitnessWorkout.programId))
		.leftJoin(
			fitnessWorkoutProgress,
			and(
				eq(fitnessWorkoutProgress.workoutId, fitnessWorkout.id),
				eq(fitnessWorkoutProgress.userId, userId),
				eq(fitnessWorkoutProgress.completedDate, today)
			)
		)
		.where(
			and(eq(fitnessProgram.slug, 'total-body-30'), eq(fitnessWorkout.day, Number(today.slice(-2))))
		)
		.limit(1);
	return {
		fitnessDone: Boolean(workout?.completedDate),
		fitnessWorkoutTitle: workout?.title ?? 'Rest day'
	};
}

async function loadNutrition(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const [entries, profile] = await Promise.all([
		getDailyEntries(db, userId, today),
		getProfile(db, userId)
	]);
	return {
		calories: sumEntryTotals(entries).calories,
		calorieGoal: profile?.dailyCalorieGoal ?? null
	};
}

async function loadMeditationDone(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const result = await db
		.select({ id: meditationSession.id })
		.from(meditationSession)
		.where(and(eq(meditationSession.userId, userId), eq(meditationSession.localDate, today)))
		.limit(1);
	return result.length > 0;
}
