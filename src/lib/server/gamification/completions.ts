import { and, eq, gte, lte } from 'drizzle-orm';
import {
	breathingExercise,
	fitnessWorkoutProgress,
	happinessEntry,
	meditationSession,
	menstruationEntry,
	nutritionEntry,
	nutritionFastingDay,
	screenTimeConnection,
	sleepDailyAdherence,
	sleepSettings,
	stepConnection,
	stepDailyTotal
} from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';
import { localDateForInstant } from '$lib/trackers/dates';
import { getDailyScreenTime } from '../../../routes/(trackers)/screen-time/server/screen-time';
import { DEFAULT_STEP_GOAL } from '../../../routes/(trackers)/steps/steps';
import { emptyCompletionDates, SCREEN_TIME_LIMIT_MINUTES, type CompletionDates } from './rules';

export async function gamificationToday(db: Database, userId: string) {
	const [steps, sleep, screenTime] = await Promise.all([
		loadStepConnection(db, userId),
		loadSleepSettings(db, userId),
		loadScreenTimeConnection(db, userId)
	]);
	const timeZone = preferredTimeZone(steps, sleep, screenTime);
	return localDateForInstant(new Date(), timeZone);
}

export async function loadCompletionDates(
	db: Database,
	userId: string,
	startDate: string,
	today: string
): Promise<CompletionDates> {
	const stepGoal = await loadStepGoal(db, userId);
	const results = await Promise.all([
		loadSteps(db, userId, startDate, today, stepGoal),
		loadSleep(db, userId, startDate, today),
		loadScreenTime(db, userId, startDate, today),
		loadFitness(db, userId, startDate, today),
		loadNutrition(db, userId, startDate, today),
		loadMeditation(db, userId, startDate, today),
		loadBreathing(db, userId, startDate, today),
		loadHappiness(db, userId, startDate, today),
		loadPeriod(db, userId, startDate, today)
	]);
	const dates = emptyCompletionDates();
	[
		dates.steps,
		dates.sleep,
		dates['screen-time'],
		dates.fitness,
		dates.nutrition,
		dates.meditation,
		dates.breathing,
		dates.happiness,
		dates.period
	] = results;
	return dates;
}

async function loadSteps(
	db: Database,
	userId: string,
	startDate: string,
	today: string,
	goal: number
) {
	const rows = await db
		.select({ date: stepDailyTotal.localDate })
		.from(stepDailyTotal)
		.where(
			and(
				eq(stepDailyTotal.userId, userId),
				gte(stepDailyTotal.localDate, startDate),
				lte(stepDailyTotal.localDate, today),
				gte(stepDailyTotal.count, goal)
			)
		);
	return rows.map(({ date }) => date);
}

async function loadSleep(db: Database, userId: string, startDate: string, today: string) {
	const rows = await db
		.select({ date: sleepDailyAdherence.localDate })
		.from(sleepDailyAdherence)
		.where(
			and(
				eq(sleepDailyAdherence.userId, userId),
				gte(sleepDailyAdherence.localDate, startDate),
				lte(sleepDailyAdherence.localDate, today),
				eq(sleepDailyAdherence.status, 'pass')
			)
		);
	return rows.map(({ date }) => date);
}

async function loadScreenTime(db: Database, userId: string, startDate: string, today: string) {
	const rows = await getDailyScreenTime(db, userId, startDate, today);
	return rows
		.filter(
			({ localDate, totalMinutes }) =>
				localDate < today && totalMinutes <= SCREEN_TIME_LIMIT_MINUTES
		)
		.map(({ localDate }) => localDate);
}

async function loadFitness(db: Database, userId: string, startDate: string, today: string) {
	const rows = await db
		.selectDistinct({ date: fitnessWorkoutProgress.completedDate })
		.from(fitnessWorkoutProgress)
		.where(
			and(
				eq(fitnessWorkoutProgress.userId, userId),
				gte(fitnessWorkoutProgress.completedDate, startDate),
				lte(fitnessWorkoutProgress.completedDate, today)
			)
		);
	return rows.map(({ date }) => date);
}

async function loadNutrition(db: Database, userId: string, startDate: string, today: string) {
	const [entryDates, fastingDates] = await db.batch([
		db
			.selectDistinct({ date: nutritionEntry.date })
			.from(nutritionEntry)
			.where(
				and(
					eq(nutritionEntry.userId, userId),
					gte(nutritionEntry.date, startDate),
					lte(nutritionEntry.date, today)
				)
			),
		db
			.select({ date: nutritionFastingDay.date })
			.from(nutritionFastingDay)
			.where(
				and(
					eq(nutritionFastingDay.userId, userId),
					gte(nutritionFastingDay.date, startDate),
					lte(nutritionFastingDay.date, today)
				)
			)
	]);
	return [...new Set([...entryDates, ...fastingDates].map(({ date }) => date))];
}

async function loadMeditation(db: Database, userId: string, startDate: string, today: string) {
	const rows = await db
		.selectDistinct({ date: meditationSession.localDate })
		.from(meditationSession)
		.where(
			and(
				eq(meditationSession.userId, userId),
				gte(meditationSession.localDate, startDate),
				lte(meditationSession.localDate, today)
			)
		);
	return rows.map(({ date }) => date);
}

async function loadBreathing(db: Database, userId: string, startDate: string, today: string) {
	const rows = await db
		.select({ date: breathingExercise.localDate })
		.from(breathingExercise)
		.where(
			and(
				eq(breathingExercise.userId, userId),
				gte(breathingExercise.localDate, startDate),
				lte(breathingExercise.localDate, today)
			)
		);
	return rows.map(({ date }) => date);
}

async function loadHappiness(db: Database, userId: string, startDate: string, today: string) {
	const rows = await db
		.select({ date: happinessEntry.localDate })
		.from(happinessEntry)
		.where(
			and(
				eq(happinessEntry.userId, userId),
				gte(happinessEntry.localDate, startDate),
				lte(happinessEntry.localDate, today)
			)
		);
	return rows.map(({ date }) => date);
}

async function loadPeriod(db: Database, userId: string, startDate: string, today: string) {
	const rows = await db
		.select({ date: menstruationEntry.localDate })
		.from(menstruationEntry)
		.where(
			and(
				eq(menstruationEntry.userId, userId),
				gte(menstruationEntry.localDate, startDate),
				lte(menstruationEntry.localDate, today)
			)
		);
	return rows.map(({ date }) => date);
}

async function loadStepGoal(db: Database, userId: string) {
	return (await loadStepConnection(db, userId))?.dailyGoal ?? DEFAULT_STEP_GOAL;
}

async function loadStepConnection(db: Database, userId: string) {
	return db.query.stepConnection.findFirst({ where: eq(stepConnection.userId, userId) });
}

async function loadSleepSettings(db: Database, userId: string) {
	return db.query.sleepSettings.findFirst({ where: eq(sleepSettings.userId, userId) });
}

async function loadScreenTimeConnection(db: Database, userId: string) {
	return db.query.screenTimeConnection.findFirst({
		where: eq(screenTimeConnection.userId, userId)
	});
}

function preferredTimeZone(
	steps: Awaited<ReturnType<typeof loadStepConnection>>,
	sleep: Awaited<ReturnType<typeof loadSleepSettings>>,
	screenTime: Awaited<ReturnType<typeof loadScreenTimeConnection>>
) {
	return (
		steps?.companionTimeZone ??
		sleep?.timeZone ??
		screenTime?.companionTimeZone ??
		steps?.timeZone ??
		screenTime?.timeZone ??
		'UTC'
	);
}
