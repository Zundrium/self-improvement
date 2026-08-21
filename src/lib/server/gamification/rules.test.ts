import { describe, expect, it } from 'vitest';
import {
	bestStreak,
	buildAchievements,
	buildStreaks,
	completeDayDates,
	currentStreak,
	emptyCompletionDates
} from './rules';

describe('gamification streaks', () => {
	it('keeps yesterday as the active streak until today is completed', () => {
		expect(currentStreak(['2026-08-18', '2026-08-19'], '2026-08-20')).toBe(2);
	});

	it('uses today when the current tracker is complete', () => {
		expect(currentStreak(['2026-08-18', '2026-08-19', '2026-08-20'], '2026-08-20')).toBe(3);
	});

	it('resets after a missed day', () => {
		expect(currentStreak(['2026-08-17', '2026-08-18'], '2026-08-20')).toBe(0);
	});

	it('finds the best historical run', () => {
		expect(bestStreak(['2026-08-10', '2026-08-11', '2026-08-14'])).toBe(2);
	});

	it('shows streaks only for active trackers', () => {
		const streaks = buildStreaks(emptyCompletionDates(), '2026-08-20', ['fitness']);
		expect(streaks.map(({ trackerId }) => trackerId)).toEqual(['fitness']);
	});

	it('completes a day only when every active tracker is complete', () => {
		const completions = emptyCompletionDates();
		completions.fitness = ['2026-08-19', '2026-08-20'];
		completions.breathing = ['2026-08-20'];
		expect(completeDayDates(completions, ['fitness', 'breathing'])).toEqual(['2026-08-20']);
	});
});

describe('gamification achievements', () => {
	it('unlocks completion, score, streak, and variety milestones', () => {
		const awards = [
			{ trackerId: 'fitness', localDate: '2026-08-18', points: 30 },
			{ trackerId: 'fitness', localDate: '2026-08-19', points: 30 },
			{ trackerId: 'fitness', localDate: '2026-08-20', points: 30 },
			{ trackerId: 'breathing', localDate: '2026-08-20', points: 10 },
			{ trackerId: 'meditation', localDate: '2026-08-20', points: 15 }
		];
		const achievements = buildAchievements(awards);
		expect(achievements.find(({ id }) => id === 'first-glimmer')?.unlocked).toBe(true);
		expect(achievements.find(({ id }) => id === 'glow-100')?.unlocked).toBe(true);
		expect(achievements.find(({ id }) => id === 'all-rounder')?.unlocked).toBe(true);
		expect(achievements.find(({ id }) => id === 'streak-5')?.unlocked).toBe(false);
	});

	it('hides tracker achievements for inactive trackers', () => {
		const achievements = buildAchievements([], ['fitness']);
		expect(achievements.some(({ id }) => id === 'fitness-first')).toBe(true);
		expect(achievements.some(({ id }) => id === 'breathing-10')).toBe(false);
	});
});
