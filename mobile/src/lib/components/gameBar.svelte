<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { Flame, Trophy } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { apiRequest, GAMIFICATION_CHANGED_EVENT } from '$lib/api';
	import type { GamificationData } from '$lib/api-types';
	import { Button } from '$lib/components/ui/button';
	import { gamificationColors } from '$lib/gamification/theme';
	import { getTrackerColors } from '$lib/trackers/registry';

	let {
		gamification: initialGamification,
		date,
		today
	}: { gamification: GamificationData; date: string; today: string } = $props();
	let gamification = $derived(initialGamification);
	const achievementColors = getTrackerColors('achievements');
	const streakColors = getTrackerColors('streaks');

	onMount(() => {
		void refreshGamification();
		window.addEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
		return () => window.removeEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
	});

	async function refreshGamification() {
		try {
			const refreshed = await apiRequest<GamificationData>('/api/app/gamification');
			gamification = refreshed;
			if (refreshed.earnedNow) celebrateEarnings(refreshed.earnedNow);
		} catch {
			return;
		}
	}

	function celebrateEarnings(points: number) {
		toast.success(`✨ +${points} Glimmers`, {
			description: 'Your completed tracker paid off.'
		});
	}

	function featureHref(path: string) {
		return date === today ? path : `${path}?date=${date}`;
	}
</script>

<section class="grid grid-cols-3" aria-label="Game progress" data-motion-item>
	<Button
		href={featureHref('/achievements')}
		variant="ghost"
		class="h-12 min-w-0 gap-2 rounded-2xl bg-transparent px-2 text-(--text) hover:bg-(--text)/5 hover:text-(--text)"
		aria-label={`${gamification.achievementCount} of ${gamification.achievementTotal} achievements`}
	>
		<Trophy class="size-5" style={`color: ${achievementColors.primary}`} />
		<strong class="text-sm font-medium tabular-nums">{gamification.achievementCount}</strong>
	</Button>

	<Button
		href={featureHref('/streaks')}
		variant="ghost"
		class="h-12 min-w-0 gap-2 rounded-2xl bg-transparent px-2 text-(--text) hover:bg-(--text)/5 hover:text-(--text)"
		aria-label={`Best current streak: ${gamification.bestCurrentStreak}`}
	>
		<Flame class="size-5" style={`color: ${streakColors.primary}`} />
		<strong class="text-sm font-medium tabular-nums">{gamification.bestCurrentStreak}</strong>
	</Button>

	<Button
		href={featureHref('/shop')}
		variant="ghost"
		class="h-12 min-w-0 gap-2 rounded-2xl bg-transparent px-2 text-(--text) hover:bg-(--text)/5 hover:text-(--text)"
		aria-label={`${gamification.glimmers} Glimmers. Open shop.`}
	>
		<Icon
			icon="ph:coin-vertical"
			class="size-5"
			style={`color: ${gamificationColors.glimmers.primary}`}
			aria-hidden="true"
		/>
		<strong class="text-sm font-medium tabular-nums"
			>{gamification.glimmers.toLocaleString()}</strong
		>
	</Button>
</section>
