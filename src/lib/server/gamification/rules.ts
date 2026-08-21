import { appTrackers as trackers, type AppTrackerId } from '$lib/trackers/registry';

export type CompletionDates = Record<AppTrackerId, string[]>;
export type AwardRecord = { trackerId: string; localDate: string; points: number };
export type StreakSummary = {
	trackerId: AppTrackerId;
	label: string;
	points: number;
	current: number;
	best: number;
	total: number;
};
export type DayStreakSummary = {
	label: string;
	current: number;
	best: number;
	total: number;
};
export type AchievementSummary = {
	id: string;
	title: string;
	description: string;
	unlocked: boolean;
	progress: number;
	target: number;
};

export const SCREEN_TIME_LIMIT_MINUTES = 4 * 60;
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

export function emptyCompletionDates(): CompletionDates {
	return {
		steps: [],
		sleep: [],
		'screen-time': [],
		fitness: [],
		nutrition: [],
		meditation: [],
		breathing: [],
		happiness: [],
		period: []
	};
}

export function activeCompletionDates(
	completions: CompletionDates,
	activeTrackerIds: AppTrackerId[]
): CompletionDates {
	const activeIds = new Set(activeTrackerIds);
	const active = emptyCompletionDates();
	for (const tracker of trackers) {
		if (activeIds.has(tracker.id)) active[tracker.id] = completions[tracker.id];
	}
	return active;
}

export function buildStreaks(
	completions: CompletionDates,
	today: string,
	activeTrackerIds: AppTrackerId[] = trackers.map(({ id }) => id)
): StreakSummary[] {
	const activeIds = new Set(activeTrackerIds);
	return trackers
		.filter(({ id }) => activeIds.has(id))
		.map(({ id, label }) => trackerStreak(id, label));

	function trackerStreak(trackerId: AppTrackerId, label: string) {
		return {
			trackerId,
			label,
			points: trackerPoints[trackerId],
			current: currentStreak(completions[trackerId], today),
			best: bestStreak(completions[trackerId]),
			total: completions[trackerId].length
		};
	}
}

export function buildDayStreak(
	completions: CompletionDates,
	today: string,
	activeTrackerIds: AppTrackerId[]
): DayStreakSummary {
	const dates = completeDayDates(completions, activeTrackerIds);
	return {
		label: 'Perfect days',
		current: currentStreak(dates, today),
		best: bestStreak(dates),
		total: dates.length
	};
}

export function completeDayDates(completions: CompletionDates, activeTrackerIds: AppTrackerId[]) {
	if (!activeTrackerIds.length) return [];
	const [firstTracker, ...otherTrackers] = activeTrackerIds;
	return [...new Set(completions[firstTracker])]
		.filter((date) => otherTrackers.every((trackerId) => completions[trackerId].includes(date)))
		.sort();
}

export function currentStreak(dates: string[], today: string) {
	const completed = new Set(dates);
	let cursor = completed.has(today) ? today : previousDate(today);
	let streak = 0;
	while (completed.has(cursor)) {
		streak += 1;
		cursor = previousDate(cursor);
	}
	return streak;
}

export function bestStreak(dates: string[]) {
	const sortedDates = [...new Set(dates)].sort();
	let best = 0;
	let streak = 0;
	let previous = '';
	for (const date of sortedDates) {
		streak = previous && date === nextDate(previous) ? streak + 1 : 1;
		best = Math.max(best, streak);
		previous = date;
	}
	return best;
}

export function buildAchievements(
	awards: AwardRecord[],
	activeTrackerIds: AppTrackerId[] = trackers.map(({ id }) => id),
	perfectDays: string[] = []
): AchievementSummary[] {
	const activeAwards = awards.filter(({ trackerId }) =>
		activeTrackerIds.includes(trackerId as AppTrackerId)
	);
	const totalScore = awards.reduce((total, award) => total + award.points, 0);
	const trackerTotals = countByTracker(awards);
	const best = Math.max(0, ...awardStreaks(activeAwards).map(({ best }) => best));
	const achievements = genericAchievements(awards, activeAwards, totalScore, best, perfectDays);
	if (activeTrackerIds.includes('fitness')) {
		achievements.push(
			achievement(
				'fitness-first',
				'Full power',
				'Complete your first workout.',
				trackerTotals.fitness,
				1
			)
		);
	}
	if (activeTrackerIds.includes('breathing')) {
		achievements.push(
			achievement(
				'breathing-10',
				'Breathing room',
				'Complete ten breathing exercises.',
				trackerTotals.breathing,
				10
			)
		);
	}
	if (activeTrackerIds.includes('meditation')) {
		achievements.push(
			achievement(
				'meditation-10',
				'Inner calm',
				'Complete ten meditations.',
				trackerTotals.meditation,
				10
			)
		);
	}
	achievements.push(
		achievement('century', 'The century', 'Complete one hundred trackers.', awards.length, 100)
	);
	return achievements;
}

function genericAchievements(
	awards: AwardRecord[],
	activeAwards: AwardRecord[],
	totalScore: number,
	best: number,
	perfectDays: string[]
) {
	return [
		achievement('first-glimmer', 'First glimmer', 'Complete your first tracker.', awards.length, 1),
		achievement('glow-100', 'Starting to glow', 'Earn 100 total score.', totalScore, 100),
		achievement(
			'perfect-day',
			'Perfect day',
			'Complete every active tracker in one day.',
			perfectDays.length,
			1
		),
		achievement('streak-5', 'On fire', 'Reach a five-completion streak.', best, 5),
		achievement(
			'all-rounder',
			'All-rounder',
			'Complete three active trackers in one day.',
			mostTrackersInOneDay(activeAwards),
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
): AchievementSummary {
	return { id, title, description, unlocked: progress >= target, progress, target };
}

function countByTracker(awards: AwardRecord[]) {
	const counts = Object.fromEntries(trackers.map(({ id }) => [id, 0])) as Record<
		AppTrackerId,
		number
	>;
	for (const award of awards) {
		if (award.trackerId in counts) counts[award.trackerId as AppTrackerId] += 1;
	}
	return counts;
}

function awardStreaks(awards: AwardRecord[]) {
	const dates = emptyCompletionDates();
	for (const award of awards) {
		if (award.trackerId in dates) dates[award.trackerId as AppTrackerId].push(award.localDate);
	}
	return trackers.map(({ id }) => ({ trackerId: id, best: bestStreak(dates[id]) }));
}

function mostTrackersInOneDay(awards: AwardRecord[]) {
	const dates = new Map<string, Set<string>>();
	for (const award of awards) {
		const trackersForDay = dates.get(award.localDate) ?? new Set<string>();
		trackersForDay.add(award.trackerId);
		dates.set(award.localDate, trackersForDay);
	}
	return Math.max(0, ...[...dates.values()].map((ids) => ids.size));
}

function previousDate(value: string) {
	return shiftDate(value, -1);
}

function nextDate(value: string) {
	return shiftDate(value, 1);
}

function shiftDate(value: string, days: number) {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}
