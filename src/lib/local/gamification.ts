import type { GamificationData } from '$lib/local/gamification/model';
import { localDateForInstant } from '$lib/trackers/dates';
import { type AppTrackerId, appTrackers } from '$lib/trackers/registry';
import { isStretchScheduled } from './stretch/model';
import { reconcileAchievementUnlocks } from './achievement-engine';
import type { LocalAppState } from './state';

export type CompletionDates = Record<AppTrackerId, string[]>;
type Award = LocalAppState['gamification']['awards'][number];

export const trackerPoints: Record<AppTrackerId, number> = {
	steps: 20,
	sleep: 20,
	'screen-time': 20,
	fitness: 30,
	nutrition: 15,
	meditation: 15,
	breathing: 10,
	stretch: 10,
	chores: 10,
	happiness: 10,
	period: 10
};

export function buildGamification(state: LocalAppState, now = new Date()): GamificationData {
	const today = localDateForInstant(now, localTimeZone());
	const completions = completionDates(state, today);
	const earnedNow = reconcileAwards(state, completions);
	const allStreaks = buildStreaks(
		completions,
		today,
		appTrackers.map(({ id }) => id)
	);
	const streaks = allStreaks.filter(({ trackerId }) => state.enabledTrackerIds.includes(trackerId));
	const perfectDays = completeDayDates(completions, state.enabledTrackerIds);
	const dayStreak = buildDayStreak(perfectDays, today);
	const score = sumPoints(state.gamification.awards);
	const achievements = reconcileAchievementUnlocks(
		{
			state,
			completions,
			score,
			bestStreak: Math.max(0, ...allStreaks.map(({ best }) => best)),
			perfectDays
		},
		now
	);
	return {
		today,
		glimmers: Math.max(0, score - spentGlimmers(state)),
		score,
		earnedNow,
		bestCurrentStreak: Math.max(dayStreak.current, ...streaks.map(({ current }) => current)),
		achievementCount: achievements.filter(({ unlocked }) => unlocked).length,
		achievementTotal: achievements.length,
		dayStreak,
		streaks,
		achievements
	};
}

export function completionDates(state: LocalAppState, today: string): CompletionDates {
	const dates = emptyCompletionDates();
	dates.steps = state.steps.days.filter((day) => day.count >= state.steps.dailyGoal).map(dayDate);
	dates.sleep = state.sleep.days.filter((day) => day.status === 'pass').map(localDate);
	dates['screen-time'] = state.screenTime.days
		.filter(
			(day) => day.date < today && trackedMinutes(state, day) <= state.screenTime.dailyLimitMinutes
		)
		.map(dayDate);
	dates.fitness = state.fitness.completedDays.map(({ dateKey }) => dateKey);
	dates.nutrition = [...state.nutrition.entries.map(dayDate), ...state.nutrition.fastingDates];
	dates.meditation = state.meditation.sessions.map(localDate);
	dates.breathing = state.breathing.exercises.map(localDate);
	dates.stretch = state.stretch.sessions.map(localDate);
	dates.chores = state.chores.sessions.map(localDate);
	dates.happiness = state.happiness.entries.map(localDate);
	dates.period = state.period.entries.map(localDate);
	return trimCompletionDates(dates, state.gamification.startedLocalDate, today);
}

export function buildStreaks(
	completions: CompletionDates,
	today: string,
	activeIds: AppTrackerId[]
) {
	return appTrackers
		.filter(({ id }) => activeIds.includes(id))
		.map(({ id, label }) => ({
			trackerId: id,
			label,
			points: trackerPoints[id],
			current: trackerCurrentStreak(id, completions[id], today),
			best: trackerBestStreak(id, completions[id]),
			total: uniqueDates(completions[id]).length
		}));
}

export function currentStreak(dates: string[], today: string) {
	const completed = new Set(dates);
	let cursor = completed.has(today) ? today : shiftDate(today, -1);
	let streak = 0;
	while (completed.has(cursor)) {
		streak += 1;
		cursor = shiftDate(cursor, -1);
	}
	return streak;
}

export function bestStreak(dates: string[]) {
	let best = 0;
	let streak = 0;
	let previous = '';
	for (const date of uniqueDates(dates)) {
		streak = previous && date === shiftDate(previous, 1) ? streak + 1 : 1;
		best = Math.max(best, streak);
		previous = date;
	}
	return best;
}

export function completeDayDates(completions: CompletionDates, activeIds: AppTrackerId[]) {
	if (!activeIds.length) return [];
	const candidateDates = uniqueDates(activeIds.flatMap((trackerId) => completions[trackerId]));
	return candidateDates.filter((date) =>
		activeIds.every((trackerId) => trackerCompletedOnDate(trackerId, date, completions))
	);
}

function trackerCurrentStreak(id: AppTrackerId, dates: string[], today: string) {
	return id === 'stretch' ? currentScheduledStreak(dates, today) : currentStreak(dates, today);
}

function trackerBestStreak(id: AppTrackerId, dates: string[]) {
	return id === 'stretch' ? bestScheduledStreak(dates) : bestStreak(dates);
}

function currentScheduledStreak(dates: string[], today: string) {
	const completed = new Set(dates);
	let cursor = latestScheduledDate(today);
	if (isStretchScheduled(today) && !completed.has(today)) cursor = previousScheduledDate(today);
	let streak = 0;
	while (completed.has(cursor)) {
		streak += 1;
		cursor = previousScheduledDate(cursor);
	}
	return streak;
}

function bestScheduledStreak(dates: string[]) {
	let best = 0;
	let streak = 0;
	let previous = '';
	for (const date of uniqueDates(dates)) {
		streak = previous && date === nextScheduledDate(previous) ? streak + 1 : 1;
		best = Math.max(best, streak);
		previous = date;
	}
	return best;
}

function latestScheduledDate(date: string) {
	let cursor = date;
	while (!isStretchScheduled(cursor)) cursor = shiftDate(cursor, -1);
	return cursor;
}

function previousScheduledDate(date: string) {
	let cursor = shiftDate(date, -1);
	while (!isStretchScheduled(cursor)) cursor = shiftDate(cursor, -1);
	return cursor;
}

function nextScheduledDate(date: string) {
	let cursor = shiftDate(date, 1);
	while (!isStretchScheduled(cursor)) cursor = shiftDate(cursor, 1);
	return cursor;
}

function trackerCompletedOnDate(
	trackerId: AppTrackerId,
	date: string,
	completions: CompletionDates
) {
	if (trackerId === 'stretch' && !isStretchScheduled(date)) return true;
	return completions[trackerId].includes(date);
}

function reconcileAwards(state: LocalAppState, completions: CompletionDates) {
	const existing = new Set(state.gamification.awards.map(awardKey));
	const awards = state.enabledTrackerIds.flatMap((trackerId) =>
		uniqueDates(completions[trackerId]).flatMap((localDate) => {
			const award = { trackerId, localDate, points: trackerPoints[trackerId] };
			return existing.has(awardKey(award)) ? [] : [award];
		})
	);
	state.gamification.awards.push(...awards);
	return sumPoints(awards);
}

function trimCompletionDates(dates: CompletionDates, start: string, today: string) {
	for (const tracker of appTrackers) {
		dates[tracker.id] = uniqueDates(dates[tracker.id]).filter(
			(date) => date >= start && date <= today
		);
	}
	return dates;
}

function buildDayStreak(dates: string[], today: string) {
	return {
		label: 'Perfect days',
		current: currentStreak(dates, today),
		best: bestStreak(dates),
		total: dates.length
	};
}

function emptyCompletionDates(): CompletionDates {
	return Object.fromEntries(appTrackers.map(({ id }) => [id, []])) as unknown as CompletionDates;
}

function trackedMinutes(state: LocalAppState, day: LocalAppState['screenTime']['days'][number]) {
	const tracked = new Set(state.screenTime.trackedPackages);
	return day.apps
		.filter((app) => tracked.has(app.package))
		.reduce((total, app) => total + app.minutes, 0);
}

function spentGlimmers(state: LocalAppState) {
	return state.redemptions.reduce((total, redemption) => total + redemption.price, 0);
}

function sumPoints(awards: Award[]) {
	return awards.reduce((total, award) => total + award.points, 0);
}

function awardKey(award: Pick<Award, 'trackerId' | 'localDate'>) {
	return `${award.trackerId}:${award.localDate}`;
}

function uniqueDates(dates: string[]) {
	return [...new Set(dates)].sort();
}

function dayDate(value: { date: string }) {
	return value.date;
}

function localDate(value: { localDate: string }) {
	return value.localDate;
}

function shiftDate(value: string, days: number) {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function localTimeZone() {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
