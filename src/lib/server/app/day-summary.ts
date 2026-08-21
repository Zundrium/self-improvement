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
import type { Database } from '$lib/server/db';
import { localDateForInstant } from '$lib/trackers/dates';
import {
	getDailyEntries,
	sumEntryTotals,
	validDate
} from '../../../routes/(trackers)/nutrition/server/nutrition';
import { getProfile } from '../../../routes/(trackers)/nutrition/server/profiles';
import {
	getDailyScreenTime,
	getScreenTimeConnection,
	hasScreenTimeMeasurements
} from '../../../routes/(trackers)/screen-time/server/screen-time';
import { DEFAULT_SCREEN_TIME_LIMIT_MINUTES } from '../../../routes/(trackers)/screen-time/screen-time';
import {
	getDailySleep,
	getSleepConnection,
	hasSleepMeasurements
} from '../../../routes/(trackers)/sleep/server/sleep';
import { DEFAULT_SLEEP_GOAL_MINUTES } from '../../../routes/(trackers)/sleep/sleep';
import {
	getDailySteps,
	getStepConnection,
	hasStepMeasurements
} from '../../../routes/(trackers)/steps/server/steps';
import { DEFAULT_STEP_GOAL } from '../../../routes/(trackers)/steps/steps';

export async function loadDaySummary(db: Database, userId: string, requestedDate: string | null) {
	const [stepConnection, sleepConnection, screenTimeConnection] = await Promise.all([
		getStepConnection(db, userId),
		getSleepConnection(db, userId),
		getScreenTimeConnection(db, userId)
	]);
	const timeZone =
		stepConnection?.companionTimeZone ??
		sleepConnection?.companionTimeZone ??
		screenTimeConnection?.companionTimeZone ??
		stepConnection?.timeZone ??
		sleepConnection?.timeZone ??
		screenTimeConnection?.timeZone ??
		'UTC';
	const today = localDateForInstant(new Date(), timeZone);
	const date = requestedDate ?? today;
	if (!validDate(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	const summaries = await Promise.all([
		loadSteps(db, userId, date),
		loadSleep(db, userId, date),
		loadScreenTime(db, userId, date),
		loadFitness(db, userId, date),
		loadNutrition(db, userId, date),
		loadMeditationDone(db, userId, date),
		loadBreathingDone(db, userId, date),
		loadHappinessRating(db, userId, date),
		loadPeriodFlow(db, userId, date),
		hasStepMeasurements(db, userId),
		hasSleepMeasurements(db, userId),
		hasScreenTimeMeasurements(db, userId)
	]);
	return {
		date,
		today,
		steps: summaries[0],
		stepGoal: stepConnection?.dailyGoal ?? DEFAULT_STEP_GOAL,
		stepsHaveMeasurements: summaries[9],
		sleepMinutes: summaries[1],
		sleepGoalMinutes: sleepConnection?.dailyGoalMinutes ?? DEFAULT_SLEEP_GOAL_MINUTES,
		sleepHasMeasurements: summaries[10],
		...summaries[2],
		screenTimeLimitMinutes: DEFAULT_SCREEN_TIME_LIMIT_MINUTES,
		screenTimeHasMeasurements: summaries[11],
		...summaries[3],
		...summaries[4],
		meditationDone: summaries[5],
		breathingDone: summaries[6],
		happinessRating: summaries[7],
		periodFlow: summaries[8]
	};
}

async function loadSteps(db: Database, userId: string, date: string) {
	return (await getDailySteps(db, userId, date, date))[0]?.count ?? 0;
}

async function loadSleep(db: Database, userId: string, date: string) {
	return Math.round(((await getDailySleep(db, userId, date, date))[0]?.durationSeconds ?? 0) / 60);
}

async function loadScreenTime(db: Database, userId: string, date: string) {
	const snapshot = (await getDailyScreenTime(db, userId, date, date))[0];
	return {
		screenTimeMinutes: snapshot?.totalMinutes ?? 0,
		screenTimeRecorded: Boolean(snapshot)
	};
}

async function loadFitness(db: Database, userId: string, date: string) {
	const [workout] = await db
		.select({ day: fitnessWorkout.day, completedDate: fitnessWorkoutProgress.completedDate })
		.from(fitnessWorkout)
		.innerJoin(fitnessProgram, eq(fitnessProgram.id, fitnessWorkout.programId))
		.leftJoin(
			fitnessWorkoutProgress,
			and(
				eq(fitnessWorkoutProgress.workoutId, fitnessWorkout.id),
				eq(fitnessWorkoutProgress.userId, userId),
				eq(fitnessWorkoutProgress.completedDate, date)
			)
		)
		.where(
			and(eq(fitnessProgram.slug, 'total-body-30'), eq(fitnessWorkout.day, Number(date.slice(-2))))
		)
		.limit(1);
	return {
		fitnessDone: Boolean(workout?.completedDate),
		fitnessWorkoutTitle: workout ? `Day ${workout.day}` : 'Rest day'
	};
}

async function loadNutrition(db: Database, userId: string, date: string) {
	const [entries, profile] = await Promise.all([
		getDailyEntries(db, userId, date),
		getProfile(db, userId)
	]);
	return {
		calories: sumEntryTotals(entries).calories,
		calorieGoal: profile?.dailyCalorieGoal ?? null
	};
}

async function loadMeditationDone(db: Database, userId: string, date: string) {
	return (
		(
			await db
				.select({ id: meditationSession.id })
				.from(meditationSession)
				.where(and(eq(meditationSession.userId, userId), eq(meditationSession.localDate, date)))
				.limit(1)
		).length > 0
	);
}

async function loadBreathingDone(db: Database, userId: string, date: string) {
	return (
		(
			await db
				.select({ localDate: breathingExercise.localDate })
				.from(breathingExercise)
				.where(and(eq(breathingExercise.userId, userId), eq(breathingExercise.localDate, date)))
				.limit(1)
		).length > 0
	);
}

async function loadHappinessRating(db: Database, userId: string, date: string) {
	const [entry] = await db
		.select({ rating: happinessEntry.rating })
		.from(happinessEntry)
		.where(and(eq(happinessEntry.userId, userId), eq(happinessEntry.localDate, date)))
		.limit(1);
	return entry?.rating ?? null;
}

async function loadPeriodFlow(db: Database, userId: string, date: string) {
	const [entry] = await db
		.select({ flow: menstruationEntry.flow })
		.from(menstruationEntry)
		.where(and(eq(menstruationEntry.userId, userId), eq(menstruationEntry.localDate, date)))
		.limit(1);
	return entry?.flow ?? null;
}
