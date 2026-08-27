import type { GamificationData } from '$lib/api-types';
import { appTrackers, type AppTrackerId } from '$lib/trackers/registry';
import { localDateForInstant } from '$lib/trackers/dates';
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
	happiness: 10,
	period: 10
};

export function buildGamification(state: LocalAppState, now = new Date()): GamificationData {
	const today = localDateForInstant(now, localTimeZone());
	const completions = completionDates(state, today);
	const earnedNow = reconcileAwards(state, completions);
	const activeIds = state.enabledTrackerIds;
	const streaks = buildStreaks(completions, today, activeIds);
	const perfectDays = completeDayDates(completions, activeIds);
	const dayStreak = buildDayStreak(perfectDays, today);
	const achievements = buildAchievements(state.gamification.awards, activeIds, perfectDays);
	const score = sumPoints(state.gamification.awards);
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
		.filter((day) => day.date < today && trackedMinutes(state, day) <= 240)
		.map(dayDate);
	dates.fitness = state.fitness.completedDays.map(({ dateKey }) => dateKey);
	dates.nutrition = [...state.nutrition.entries.map(dayDate), ...state.nutrition.fastingDates];
	dates.meditation = state.meditation.sessions.map(localDate);
	dates.breathing = state.breathing.exercises.map(localDate);
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
			current: currentStreak(completions[id], today),
			best: bestStreak(completions[id]),
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
	const [first, ...remaining] = activeIds;
	return uniqueDates(completions[first]).filter((date) =>
		remaining.every((trackerId) => completions[trackerId].includes(date))
	);
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

function buildAchievements(awards: Award[], activeIds: AppTrackerId[], perfectDays: string[]) {
	const activeAwards = awards.filter(({ trackerId }) =>
		activeIds.includes(trackerId as AppTrackerId)
	);
	const achievements = genericAchievements(awards, activeAwards, perfectDays);
	if (activeIds.includes('fitness'))
		achievements.push(
			achievement(
				'fitness-first',
				'Full power',
				'Complete your first workout.',
				trackerCount(awards, 'fitness'),
				1
			)
		);
	if (activeIds.includes('breathing'))
		achievements.push(
			achievement(
				'breathing-10',
				'Breathing room',
				'Complete ten breathing exercises.',
				trackerCount(awards, 'breathing'),
				10
			)
		);
	if (activeIds.includes('meditation'))
		achievements.push(
			achievement(
				'meditation-10',
				'Inner calm',
				'Complete ten meditations.',
				trackerCount(awards, 'meditation'),
				10
			)
		);
	achievements.push(
		achievement('century', 'The century', 'Complete one hundred trackers.', awards.length, 100)
	);
	return achievements;
}

function genericAchievements(awards: Award[], activeAwards: Award[], perfectDays: string[]) {
	return [
		achievement('first-glimmer', 'First glimmer', 'Complete your first tracker.', awards.length, 1),
		achievement('glow-100', 'Starting to glow', 'Earn 100 total score.', sumPoints(awards), 100),
		achievement(
			'perfect-day',
			'Perfect day',
			'Complete every active tracker in one day.',
			perfectDays.length,
			1
		),
		achievement(
			'streak-5',
			'On fire',
			'Reach a five-completion streak.',
			bestAwardStreak(activeAwards),
			5
		),
		achievement(
			'all-rounder',
			'All-rounder',
			'Complete three active trackers in one day.',
			mostTrackersInDay(activeAwards),
			3
		)
	];
}

function achievement(
	id: string,
	title: string,
	description: string,
	progress: number,
	target: number
) {
	return { id, title, description, unlocked: progress >= target, progress, target };
}

function bestAwardStreak(awards: Award[]) {
	const grouped = new Map<string, string[]>();
	for (const award of awards)
		grouped.set(award.trackerId, [...(grouped.get(award.trackerId) ?? []), award.localDate]);
	return Math.max(0, ...[...grouped.values()].map(bestStreak));
}

function mostTrackersInDay(awards: Award[]) {
	const grouped = new Map<string, Set<string>>();
	for (const award of awards) {
		const ids = grouped.get(award.localDate) ?? new Set<string>();
		ids.add(award.trackerId);
		grouped.set(award.localDate, ids);
	}
	return Math.max(0, ...[...grouped.values()].map(({ size }) => size));
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

function trackerCount(awards: Award[], trackerId: AppTrackerId) {
	return awards.filter((award) => award.trackerId === trackerId).length;
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
