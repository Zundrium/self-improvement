import type { AchievementSummary } from '$lib/local/gamification/model';
import { appTrackers } from '$lib/trackers/registry';
import { isStretchScheduled } from './stretch/model';
import {
	type AchievementDefinition,
	achievementCatalog,
	type CombinationMetric,
	isAchievementId,
	type StateAchievementMetric,
	type TrackerSpecialMetric
} from './achievement-catalog';
import { fitnessProgram } from './fitness-program';
import type { CompletionDates } from './gamification';
import type { LocalAppState } from './state';

export type AchievementEvaluationContext = {
	state: LocalAppState;
	completions: CompletionDates;
	score: number;
	bestStreak: number;
	perfectDays: string[];
};

const fitnessWorkoutIds = fitnessProgram({}).workouts.map(({ id }) => id);

export function reconcileAchievementUnlocks(
	context: AchievementEvaluationContext,
	now = new Date()
): AchievementSummary[] {
	for (const achievement of achievementCatalog) {
		if (achievement.metric.type === 'event') continue;
		if (achievementProgress(achievement, context) < achievement.target) continue;
		recordAchievementUnlock(context.state, achievement.id, now);
	}
	return buildAchievementSummaries(context);
}

export function buildAchievementSummaries(
	context: AchievementEvaluationContext
): AchievementSummary[] {
	const unlocks = new Map(
		context.state.gamification.achievementUnlocks.map((unlock) => [unlock.achievementId, unlock])
	);
	return achievementCatalog.map((achievement) => {
		const unlock = unlocks.get(achievement.id);
		const progress = achievementProgress(achievement, context);
		return {
			id: achievement.id,
			title: achievement.title,
			description: achievement.description,
			icon: achievement.icon,
			category: achievement.category,
			...(achievement.trackerId ? { trackerId: achievement.trackerId } : {}),
			unlocked: Boolean(unlock),
			unlockedAt: unlock?.unlockedAt ?? null,
			progress: unlock ? Math.max(progress, achievement.target) : progress,
			target: achievement.target
		};
	});
}

export function recordAchievementUnlock(
	state: LocalAppState,
	achievementId: string,
	unlockedAt: Date | string = new Date()
) {
	if (!isAchievementId(achievementId)) throw new Error(`Unknown achievement: ${achievementId}`);
	if (
		state.gamification.achievementUnlocks.some((unlock) => unlock.achievementId === achievementId)
	)
		return false;
	state.gamification.achievementUnlocks.push({
		achievementId,
		unlockedAt: achievementInstant(unlockedAt)
	});
	return true;
}

function achievementProgress(
	achievement: AchievementDefinition,
	context: AchievementEvaluationContext
) {
	const metric = achievement.metric;
	switch (metric.type) {
		case 'tracker-completions':
			return new Set(context.completions[metric.trackerId]).size;
		case 'score':
			return context.score;
		case 'best-streak':
			return context.bestStreak;
		case 'all-trackers-ever':
			return Number(appTrackers.every(({ id }) => context.completions[id].length > 0));
		case 'trackers-same-day':
			return mostTrackersOnSameDay(context.completions);
		case 'perfect-days':
			return context.perfectDays.length;
		case 'tracker-special':
			return trackerSpecialProgress(metric.key, metric.value, context);
		case 'combination':
			return combinationProgress(metric.key, context);
		case 'state':
			return stateProgress(metric.key, context.state);
		case 'event':
			return 0;
	}
}

function trackerSpecialProgress(
	metric: TrackerSpecialMetric,
	value: string | undefined,
	context: AchievementEvaluationContext
) {
	const state = context.state;
	switch (metric) {
		case 'steps-10k':
		case 'steps-20k':
			return Math.max(0, ...state.steps.days.map(({ count }) => count));
		case 'steps-double-goal':
			return Math.max(0, ...state.steps.days.map(({ count }) => count / state.steps.dailyGoal));
		case 'sleep-zero-late-usage':
			return Number(
				state.sleep.days.some(
					({ status, lateUsageSeconds }) => status === 'pass' && !lateUsageSeconds
				)
			);
		case 'sleep-streak':
			return bestStreak(context.completions.sleep);
		case 'screen-time-half-limit':
			return Number(hasHalfLimitScreenDay(state));
		case 'screen-time-streak':
			return bestStreak(context.completions['screen-time']);
		case 'fitness-complete-program':
			return Number(completedFitnessProgram(state.fitness.completedDays));
		case 'fitness-morning-workout':
			return Number(state.fitness.completedDays.some(isMorningWorkout));
		case 'fitness-return-after-cycle':
			return Number(returnedAfterFitnessCycle(state.fitness.completedDays));
		case 'nutrition-profile-configured':
			return Number(state.nutrition.profile !== null);
		case 'nutrition-photo-meal':
			return Number(
				state.nutrition.entries.some(({ meals }) =>
					meals.some(({ imageDataUrl }) => imageDataUrl.trim().length > 0)
				)
			);
		case 'nutrition-fasting-day':
			return Number(state.nutrition.fastingDates.length > 0);
		case 'meditation-long-session':
			return Math.max(
				0,
				...state.meditation.sessions.map(({ durationSeconds }) => durationSeconds)
			);
		case 'meditation-total-time':
			return sumDurations(state.meditation.sessions);
		case 'breathing-478':
			return Number(state.breathing.exercises.some(({ technique }) => technique === '4-7-8'));
		case 'breathing-streak':
			return bestStreak(context.completions.breathing);
		case 'breathing-total-time':
			return sumDurations(state.breathing.exercises);
		case 'stretch-hard-variation':
			return Number(
				state.stretch.sessions.some(({ hardVariationCompleted }) => hardVariationCompleted)
			);
		case 'stretch-long-hold':
			return Math.max(0, ...state.stretch.sessions.map(({ holdSeconds }) => holdSeconds));
		case 'stretch-full-week':
			return bestScheduledWeek(context.completions.stretch);
		case 'happiness-top-rating':
			return Math.max(0, ...state.happiness.entries.map(({ rating }) => rating));
		case 'happiness-reason':
			return Number(
				state.happiness.entries.some(({ reasons }) => value && reasons.includes(value))
			);
		case 'period-notes':
			return Number(state.period.entries.some(({ notes }) => notes.trim().length > 0));
		case 'period-cycle-history':
			return Number(hasPeriodCycleHistory(state.period.entries.map(({ localDate }) => localDate)));
		case 'period-cycle-starts':
			return periodCycleStarts(state.period.entries.map(({ localDate }) => localDate)).length;
	}
}

function combinationProgress(metric: CombinationMetric, context: AchievementEvaluationContext) {
	const { completions, state } = context;
	switch (metric) {
		case 'stretch-then-fitness':
			return Number(hasStretchThenFitness(state));
		case 'fitness-meditation':
			return Number(commonCompletionDate([completions.fitness, completions.meditation]));
		case 'nutrition-fitness':
			return Number(commonCompletionDate([completions.nutrition, completions.fitness]));
		case 'stretch-breathing-meditation':
			return Number(
				commonCompletionDate([completions.stretch, completions.breathing, completions.meditation])
			);
		case 'screen-time-sleep':
			return Number(commonCompletionDate([completions['screen-time'], completions.sleep]));
		case 'steps-nutrition-screen-time-sleep':
			return Number(
				commonCompletionDate([
					completions.steps,
					completions.nutrition,
					completions['screen-time'],
					completions.sleep
				])
			);
		case 'fitness-happiness-four':
			return Number(
				state.happiness.entries.some(
					({ localDate, rating }) => rating >= 4 && completions.fitness.includes(localDate)
				)
			);
		case 'meditation-nutrition':
			return Number(commonCompletionDate([completions.meditation, completions.nutrition]));
		case 'low-happiness-then-calm':
			return Number(hasLowHappinessThenCalm(state));
		case 'fitness-then-sleep':
			return Number(
				completions.fitness.some((date) => completions.sleep.includes(shiftDate(date, 1)))
			);
	}
}

function stateProgress(metric: StateAchievementMetric, state: LocalAppState) {
	switch (metric) {
		case 'reward-count':
			return state.rewards.length;
		case 'redemption-count':
			return state.redemptions.length;
	}
}

function completedFitnessProgram(completions: LocalAppState['fitness']['completedDays']) {
	const completedIds = new Set(completions.map(({ workoutId }) => workoutId));
	return fitnessWorkoutIds.every((id) => completedIds.has(id));
}

function returnedAfterFitnessCycle(completions: LocalAppState['fitness']['completedDays']) {
	const ordered = completions
		.filter((completion): completion is typeof completion & { completedAt: string } =>
			validInstant(completion.completedAt)
		)
		.toSorted((left, right) => Date.parse(left.completedAt) - Date.parse(right.completedAt));
	const completedIds = new Set<number>();
	for (const [index, completion] of ordered.entries()) {
		completedIds.add(completion.workoutId);
		if (fitnessWorkoutIds.every((id) => completedIds.has(id)) && index < ordered.length - 1)
			return true;
	}
	return false;
}

function isMorningWorkout(completion: LocalAppState['fitness']['completedDays'][number]) {
	if (!validInstant(completion.completedAt)) return false;
	return new Date(completion.completedAt).getHours() < 12;
}

function hasStretchThenFitness(state: LocalAppState) {
	return state.stretch.sessions.some((stretch) => {
		const stretchTime = Date.parse(stretch.completedAt);
		return state.fitness.completedDays.some(
			(fitness) =>
				fitness.dateKey === stretch.localDate &&
				validInstant(fitness.completedAt) &&
				stretchTime < Date.parse(fitness.completedAt)
		);
	});
}

function hasLowHappinessThenCalm(state: LocalAppState) {
	return state.happiness.entries.some((entry) => {
		if (entry.rating > 2) return false;
		const checkInTime = Date.parse(entry.updatedAt);
		return (
			state.meditation.sessions.some(
				(session) => session.localDate === entry.localDate && session.startedAt > checkInTime
			) ||
			state.breathing.exercises.some(
				(exercise) => exercise.localDate === entry.localDate && exercise.startedAt > checkInTime
			)
		);
	});
}

function hasHalfLimitScreenDay(state: LocalAppState) {
	if (!state.screenTime.trackedPackages.length) return false;
	const trackedPackages = new Set(state.screenTime.trackedPackages);
	return state.screenTime.days.some((day) => {
		const trackedMinutes = day.apps
			.filter((app) => trackedPackages.has(app.package))
			.reduce((total, app) => total + app.minutes, 0);
		return trackedMinutes <= state.screenTime.dailyLimitMinutes / 2;
	});
}

function bestScheduledWeek(dates: string[]) {
	const completed = new Set(dates);
	const mondayCounts = new Map<string, number>();
	for (const date of completed) {
		if (!isStretchScheduled(date)) continue;
		const monday = shiftDate(date, -(dateDay(date) - 1));
		mondayCounts.set(monday, (mondayCounts.get(monday) ?? 0) + 1);
	}
	return Math.max(0, ...mondayCounts.values());
}

function bestStreak(dates: string[]) {
	let best = 0;
	let streak = 0;
	let previous = '';
	for (const date of [...new Set(dates)].sort()) {
		streak = previous && date === shiftDate(previous, 1) ? streak + 1 : 1;
		best = Math.max(best, streak);
		previous = date;
	}
	return best;
}

function periodCycleStarts(dates: string[]) {
	const sorted = [...new Set(dates)].sort();
	return sorted.filter((date, index) => index === 0 || daysBetween(sorted[index - 1], date) > 1);
}

function hasPeriodCycleHistory(dates: string[]) {
	const starts = periodCycleStarts(dates);
	return starts.slice(1).some((date, index) => {
		const cycleDays = daysBetween(starts[index], date);
		return cycleDays >= 15 && cycleDays <= 60;
	});
}

function sumDurations(values: Array<{ durationSeconds: number }>) {
	return values.reduce((total, { durationSeconds }) => total + durationSeconds, 0);
}

function mostTrackersOnSameDay(completions: CompletionDates) {
	const trackerIdsByDate = new Map<string, Set<string>>();
	for (const tracker of appTrackers) {
		for (const date of completions[tracker.id]) {
			const trackerIds = trackerIdsByDate.get(date) ?? new Set<string>();
			trackerIds.add(tracker.id);
			trackerIdsByDate.set(date, trackerIds);
		}
	}
	return Math.max(0, ...[...trackerIdsByDate.values()].map(({ size }) => size));
}

function commonCompletionDate(completionGroups: string[][]) {
	if (!completionGroups.length) return false;
	const [first, ...rest] = completionGroups.map((dates) => new Set(dates));
	return [...first].some((date) => rest.every((dates) => dates.has(date)));
}

function validInstant(value: string | undefined): value is string {
	return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function achievementInstant(value: Date | string) {
	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isFinite(date.getTime())) throw new Error('Achievement unlock time must be valid');
	return date.toISOString();
}

function dateDay(value: string) {
	return new Date(`${value}T00:00:00.000Z`).getUTCDay();
}

function daysBetween(start: string, end: string) {
	return Math.round(
		(Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000
	);
}

function shiftDate(value: string, days: number) {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}
