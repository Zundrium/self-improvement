import type { AppTrackerId } from '$lib/trackers/registry';

export type StreakSummary = {
	trackerId: AppTrackerId;
	label: string;
	points: number;
	current: number;
	best: number;
	total: number;
};
export type DayStreakSummary = { label: string; current: number; best: number; total: number };
export type AchievementCategory =
	| 'tracker-milestone'
	| 'score'
	| 'streak'
	| 'overall'
	| 'tracker-special'
	| 'combination'
	| 'event';
export type AchievementSummary = {
	id: string;
	title: string;
	description: string;
	icon: string;
	category: AchievementCategory;
	trackerId?: AppTrackerId;
	unlocked: boolean;
	unlockedAt: string | null;
	progress: number;
	target: number;
};
export type GamificationData = {
	today: string;
	glimmers: number;
	score: number;
	earnedNow: number;
	bestCurrentStreak: number;
	achievementCount: number;
	achievementTotal: number;
	dayStreak: DayStreakSummary;
	streaks: StreakSummary[];
	achievements: AchievementSummary[];
};
export type Reward = { id: string; name: string; emoji: string; price: number };
export type RewardRedemption = Reward & { redeemedAt: string };
export type RewardsData = {
	today: string;
	glimmers: number;
	rewards: Reward[];
	redemptions: RewardRedemption[];
};
