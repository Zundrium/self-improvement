import { describe, expect, it } from 'vitest';
import type { AchievementSummary, GamificationData } from '$lib/api-types';
import { mergeGamificationBaseline } from './gamificationToast.svelte';

function gamification(achievements: AchievementSummary[]): GamificationData {
	return {
		today: '2026-04-07',
		glimmers: 0,
		score: 0,
		earnedNow: 0,
		bestCurrentStreak: 0,
		achievementCount: achievements.filter(({ unlocked }) => unlocked).length,
		achievementTotal: achievements.length,
		dayStreak: { label: 'Perfect days', current: 0, best: 0, total: 0 },
		streaks: [],
		achievements
	};
}

function achievement(id: string, unlocked: boolean): AchievementSummary {
	return {
		id,
		title: id,
		description: id,
		icon: 'trophy',
		category: 'overall',
		unlocked,
		unlockedAt: unlocked ? '2026-04-07T12:00:00.000Z' : null,
		progress: unlocked ? 1 : 0,
		target: 1
	};
}

describe('gamification toast baseline', () => {
	it('keeps achievements unlocked when an older snapshot arrives after a newer one', () => {
		const current = gamification([achievement('first', true), achievement('second', false)]);
		const stale = gamification([achievement('first', false), achievement('second', false)]);

		expect(mergeGamificationBaseline(current, stale).achievements).toMatchObject([
			{ id: 'first', unlocked: true },
			{ id: 'second', unlocked: false }
		]);
	});
});
