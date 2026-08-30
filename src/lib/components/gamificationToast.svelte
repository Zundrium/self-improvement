<script lang="ts">
import { onMount, untrack } from 'svelte';
import { apiRequest, GAMIFICATION_CHANGED_EVENT } from '$lib/api';
import type { GamificationData } from '$lib/api-types';
import { toast } from '$lib/components/ui/toast';
import {
	TRACKER_CELEBRATION_ENDED_EVENT,
	TRACKER_COMPLETED_EVENT
} from '$lib/local/completion-events';

let { gamification }: { gamification: GamificationData } = $props();
let previousGamification: GamificationData | undefined;
let celebrationActive = false;
let pendingGamification: GamificationData[] = [];

$effect(() => {
	const nextGamification = gamification;
	untrack(() => announceOrQueue(nextGamification));
});

onMount(() => {
	const startCelebration = () => (celebrationActive = true);
	const finishCelebration = () => {
		celebrationActive = false;
		flushPendingGamification();
	};
	window.addEventListener(TRACKER_COMPLETED_EVENT, startCelebration);
	window.addEventListener(TRACKER_CELEBRATION_ENDED_EVENT, finishCelebration);
	window.addEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
	return () => {
		window.removeEventListener(TRACKER_COMPLETED_EVENT, startCelebration);
		window.removeEventListener(TRACKER_CELEBRATION_ENDED_EVENT, finishCelebration);
		window.removeEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
	};
});

async function refreshGamification() {
	try {
		announceOrQueue(await apiRequest<GamificationData>('/api/app/gamification'));
	} catch {
		return;
	}
}

function announceOrQueue(next: GamificationData) {
	if (celebrationActive) return void pendingGamification.push(next);
	announceAndRemember(next);
}

function flushPendingGamification() {
	for (const next of pendingGamification) announceAndRemember(next);
	pendingGamification = [];
}

function announceAndRemember(next: GamificationData) {
	if (previousGamification) announceChanges(previousGamification, next);
	previousGamification = next;
}

function announceChanges(previous: GamificationData, next: GamificationData) {
	for (const achievement of unlockedSince(previous, next)) {
		toast.achievement(`Achievement unlocked: ${achievement.title}`, {
			id: `achievement-${achievement.id}`,
			description: achievement.description
		});
	}
	if (next.dayStreak.current > previous.dayStreak.current)
		toast.streak(streakMessage('Perfect days', next.dayStreak.current), {
			id: `streak-perfect-${next.dayStreak.current}`
		});
	for (const streak of increasedStreaks(previous, next)) {
		toast.streak(streakMessage(streak.label, streak.current), {
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
