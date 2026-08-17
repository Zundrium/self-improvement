import { and, eq } from 'drizzle-orm';

import { fitnessWorkoutProgress, meditationSession } from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { getDailyEntries, sumEntryTotals } from './calories/server/nutrition';
import { getProfile } from './calories/server/profiles';
import { getDailySteps, getStepConnection } from './steps/server/steps';
import { localDateForInstant } from './steps/steps';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	return { dashboard: await loadDashboard(requireDb(event.locals), user.id) };
};

async function loadDashboard(db: ReturnType<typeof requireDb>, userId: string) {
	const today = await dashboardDate(db, userId);
	const [steps, fitnessDone, nutrition, meditationDone] = await Promise.all([
		loadSteps(db, userId, today),
		loadFitnessDone(db, userId, today),
		loadNutrition(db, userId, today),
		loadMeditationDone(db, userId, today)
	]);
	return { today, steps, fitnessDone, ...nutrition, meditationDone };
}

async function dashboardDate(db: ReturnType<typeof requireDb>, userId: string) {
	const connection = await getStepConnection(db, userId);
	return localDateForInstant(new Date(), connection?.timeZone ?? 'UTC');
}

async function loadSteps(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const totals = await getDailySteps(db, userId, today, today);
	return totals[0]?.count ?? 0;
}

async function loadFitnessDone(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const result = await db
		.select({ workoutId: fitnessWorkoutProgress.workoutId })
		.from(fitnessWorkoutProgress)
		.where(
			and(
				eq(fitnessWorkoutProgress.userId, userId),
				eq(fitnessWorkoutProgress.completedDate, today)
			)
		)
		.limit(1);
	return result.length > 0;
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
