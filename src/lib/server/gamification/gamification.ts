import { and, eq, gte, sql } from 'drizzle-orm';
import { gamificationAward, gamificationProfile, shopRedemption } from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';
import { getEnabledTrackers } from '$lib/server/trackers/preferences';
import type { AppTrackerId } from '$lib/trackers/registry';
import { gamificationToday, loadCompletionDates } from './completions';
import {
	activeCompletionDates,
	buildAchievements,
	buildDayStreak,
	buildStreaks,
	completeDayDates,
	trackerPoints,
	type AwardRecord,
	type CompletionDates
} from './rules';

export async function loadGamification(
	db: Database,
	userId: string,
	enabledTrackerIds?: AppTrackerId[]
) {
	const today = await gamificationToday(db, userId);
	const startDate = await ensureProfile(db, userId, today);
	const activeIds = enabledTrackerIds ?? (await loadEnabledTrackerIds(db, userId));
	const completions = await loadCompletionDates(db, userId, startDate, today);
	const activeCompletions = activeCompletionDates(completions, activeIds);
	const earnedNow = await reconcileAwards(db, userId, activeCompletions, startDate);
	const [awards, spent] = await Promise.all([
		loadAwards(db, userId, startDate),
		loadSpentGlimmers(db, userId)
	]);
	const perfectDays = completeDayDates(completions, activeIds);
	const streaks = buildStreaks(completions, today, activeIds);
	const dayStreak = buildDayStreak(completions, today, activeIds);
	const achievements = buildAchievements(awards, activeIds, perfectDays);
	const score = awards.reduce((total, award) => total + award.points, 0);
	return {
		today,
		glimmers: Math.max(0, score - spent),
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

async function loadEnabledTrackerIds(db: Database, userId: string) {
	return (await getEnabledTrackers(db, userId)).map(({ id }) => id);
}

async function ensureProfile(db: Database, userId: string, today: string) {
	await db
		.insert(gamificationProfile)
		.values({ userId, startedLocalDate: today })
		.onConflictDoNothing();
	const profile = await db.query.gamificationProfile.findFirst({
		where: eq(gamificationProfile.userId, userId)
	});
	return profile?.startedLocalDate ?? today;
}

async function reconcileAwards(
	db: Database,
	userId: string,
	completions: CompletionDates,
	startDate: string
) {
	const existing = await loadAwardKeys(db, userId, startDate);
	const awards = awardCandidates(userId, completions).filter(
		({ trackerId, localDate }) => !existing.has(`${trackerId}:${localDate}`)
	);
	if (!awards.length) return 0;
	await db.insert(gamificationAward).values(awards).onConflictDoNothing();
	return awards.reduce((total, award) => total + award.points, 0);
}

function awardCandidates(userId: string, completions: CompletionDates) {
	return Object.entries(completions).flatMap(([trackerId, dates]) =>
		dates.map((localDate) => ({
			id: crypto.randomUUID(),
			userId,
			trackerId,
			localDate,
			points: trackerPoints[trackerId as AppTrackerId]
		}))
	);
}

async function loadAwardKeys(db: Database, userId: string, startDate: string) {
	const awards = await db
		.select({ trackerId: gamificationAward.trackerId, localDate: gamificationAward.localDate })
		.from(gamificationAward)
		.where(and(eq(gamificationAward.userId, userId), gte(gamificationAward.localDate, startDate)));
	return new Set(awards.map(({ trackerId, localDate }) => `${trackerId}:${localDate}`));
}

async function loadAwards(db: Database, userId: string, startDate: string): Promise<AwardRecord[]> {
	return db
		.select({
			trackerId: gamificationAward.trackerId,
			localDate: gamificationAward.localDate,
			points: gamificationAward.points
		})
		.from(gamificationAward)
		.where(and(eq(gamificationAward.userId, userId), gte(gamificationAward.localDate, startDate)));
}

export async function loadSpentGlimmers(db: Database, userId: string) {
	const [result] = await db
		.select({ total: sql<number>`coalesce(sum(${shopRedemption.price}), 0)` })
		.from(shopRedemption)
		.where(eq(shopRedemption.userId, userId));
	return Number(result?.total ?? 0);
}
