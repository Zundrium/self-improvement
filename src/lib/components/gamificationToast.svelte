<script lang="ts">
import { onMount, untrack } from 'svelte';
import { apiRequest, GAMIFICATION_CHANGED_EVENT } from '$lib/api';
import type { GamificationData } from '$lib/api-types';
import { toast } from '$lib/components/ui/toast';

let { gamification }: { gamification: GamificationData } = $props();
let previousGamification: GamificationData | undefined;

$effect(() => {
	const nextGamification = gamification;
	untrack(() => announceAndRemember(nextGamification));
});

onMount(() => {
	const refreshGamification = async () => {
		try {
			const refreshed = await apiRequest<GamificationData>('/api/app/gamification');
			announceAndRemember(refreshed);
		} catch {
			return;
		}
	};
	window.addEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
	return () => window.removeEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
});

function announceAndRemember(next: GamificationData) {
	if (previousGamification) announceChanges(previousGamification, next);
	previousGamification = next;
}

function announceChanges(previous: GamificationData, next: GamificationData) {
	if (next.earnedNow)
		toast.success(`✨ +${next.earnedNow} Glimmers`, {
			id: `glimmers-${next.score}`,
			description: 'Your completed tracker paid off.'
		});
	for (const achievement of unlockedSince(previous, next)) {
		toast.success(`Achievement unlocked: ${achievement.title}`, {
			id: `achievement-${achievement.id}`,
			description: achievement.description
		});
	}
	if (next.dayStreak.current > previous.dayStreak.current)
		toast.success(streakMessage('Perfect days', next.dayStreak.current), {
			id: `streak-perfect-${next.dayStreak.current}`
		});
	for (const streak of increasedStreaks(previous, next)) {
		toast.success(streakMessage(streak.label, streak.current), {
			id: `streak-${streak.trackerId}-${streak.current}`
		});
	}
}

function unlockedSince(previous: GamificationData, next: GamificationData) {
	const unlocked = new Set(
		previous.achievements.filter(({ unlocked }) => unlocked).map(({ id }) => id)
	);
	return next.achievements.filter(
		(achievement) => achievement.unlocked && !unlocked.has(achievement.id)
	);
}

function streakMessage(label: string, days: number) {
	return `${label} streak: ${days} ${days === 1 ? 'day' : 'days'}`;
}

function increasedStreaks(previous: GamificationData, next: GamificationData) {
	const previousStreaks = new Map(
		previous.streaks.map((streak) => [streak.trackerId, streak.current])
	);
	return next.streaks.filter(
		(streak) => streak.current > (previousStreaks.get(streak.trackerId) ?? 0)
	);
}
</script>
