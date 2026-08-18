import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

import {
	breathingExercise,
	fitnessProgram,
	fitnessWorkout,
	fitnessWorkoutProgress,
	happinessEntry,
	meditationSession,
	menstruationEntry
} from '$lib/server/db/schema';
import { requireDb, requireUser } from '$lib/server/guards';
import { localDateForInstant } from '$lib/trackers/dates';
import {
	getDailyEntries,
	sumEntryTotals,
	validDate
} from './(trackers)/nutrition/server/nutrition';
import { getProfile } from './(trackers)/nutrition/server/profiles';
import {
	getDailyScreenTime,
	getScreenTimeConnection
} from './(trackers)/screen-time/server/screen-time';
import { getDailySleep, getSleepConnection } from './(trackers)/sleep/server/sleep';
import { DEFAULT_SLEEP_GOAL_MINUTES } from './(trackers)/sleep/sleep';
import { getDailySteps, getStepConnection } from './(trackers)/steps/server/steps';
import { DEFAULT_STEP_GOAL } from './(trackers)/steps/steps';
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
	const [stepConnection, sleepConnection, screenTimeConnection] = await Promise.all([
		getStepConnection(db, userId),
		getSleepConnection(db, userId),
		getScreenTimeConnection(db, userId)
	]);
	const timeZone =
		stepConnection?.timeZone ?? sleepConnection?.timeZone ?? screenTimeConnection?.timeZone;
	const today = localDateForInstant(new Date(), timeZone ?? 'UTC');
	const date = requestedDate ?? today;
	if (!validDate(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	const [
		steps,
		sleepMinutes,
		screenTimeMinutes,
		fitness,
		nutrition,
		meditationDone,
		breathingDone,
		happinessRating,
		periodFlow
	] = await Promise.all([
		loadSteps(db, userId, date),
		loadSleep(db, userId, date),
		loadScreenTime(db, userId, date),
		loadFitness(db, userId, date),
		loadNutrition(db, userId, date),
		loadMeditationDone(db, userId, date),
		loadBreathingDone(db, userId, date),
		loadHappinessRating(db, userId, date),
		loadPeriodFlow(db, userId, date)
	]);
	return {
		date,
		today,
		steps,
		stepGoal: stepConnection?.dailyGoal ?? DEFAULT_STEP_GOAL,
		sleepMinutes,
		sleepGoalMinutes: sleepConnection?.dailyGoalMinutes ?? DEFAULT_SLEEP_GOAL_MINUTES,
		screenTimeMinutes,
		...fitness,
		...nutrition,
		meditationDone,
		breathingDone,
		happinessRating,
		periodFlow
	};
}

async function loadSteps(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const totals = await getDailySteps(db, userId, today, today);
	return totals[0]?.count ?? 0;
}

async function loadSleep(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const totals = await getDailySleep(db, userId, today, today);
	return Math.round((totals[0]?.durationSeconds ?? 0) / 60);
}

async function loadScreenTime(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const totals = await getDailyScreenTime(db, userId, today, today);
	return totals[0]?.totalMinutes ?? 0;
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
		fitnessWorkoutTitle: workout?.title.replace(/^Total Body -\s*/, '') ?? 'Rest day'
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

async function loadBreathingDone(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const result = await db
		.select({ localDate: breathingExercise.localDate })
		.from(breathingExercise)
		.where(and(eq(breathingExercise.userId, userId), eq(breathingExercise.localDate, today)))
		.limit(1);
	return result.length > 0;
}

async function loadHappinessRating(
	db: ReturnType<typeof requireDb>,
	userId: string,
	today: string
) {
	const [entry] = await db
		.select({ rating: happinessEntry.rating })
		.from(happinessEntry)
		.where(and(eq(happinessEntry.userId, userId), eq(happinessEntry.localDate, today)))
		.limit(1);
	return entry?.rating ?? null;
}

async function loadPeriodFlow(db: ReturnType<typeof requireDb>, userId: string, today: string) {
	const [entry] = await db
		.select({ flow: menstruationEntry.flow })
		.from(menstruationEntry)
		.where(and(eq(menstruationEntry.userId, userId), eq(menstruationEntry.localDate, today)))
		.limit(1);
	return entry?.flow ?? null;
}
