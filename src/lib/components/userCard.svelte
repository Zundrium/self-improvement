<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Coins, Flame, Settings, Trophy } from '@lucide/svelte';
	import { apiRequest, GAMIFICATION_CHANGED_EVENT } from '$lib/api';
	import type { GamificationData, LocalProfile } from '$lib/api-types';
	import { gameGradient, gamificationColors } from '$lib/gamification/theme';
	import { staggerChildren } from '$lib/motion/gsap';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import AudioVolumeControl from './audioVolumeControl.svelte';

	type Props = {
		profile: LocalProfile;
		initialGamification: GamificationData;
		onSelect?: () => void;
	};

	let { profile, initialGamification, onSelect }: Props = $props();
	let gamification = $state(untrack(() => initialGamification));
	const achievementColors = getTrackerColors('achievements');
	const streakColors = getTrackerColors('streaks');

	onMount(() => {
		void refreshGamification();
		window.addEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
		return () => window.removeEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
	});

	async function refreshGamification() {
		try {
			gamification = await apiRequest<GamificationData>('/api/app/gamification');
		} catch {
			return;
		}
	}
</script>

<div class="app-gutter py-(--app-overlay-padding)">
	<div
		class="mx-auto w-full max-w-(--app-compact-max-width) space-y-4"
		use:staggerChildren={{ delay: 0.08, selector: '[data-user-card-item]', y: 16 }}
	>
		<header class="flex items-center gap-3 px-1" data-user-card-item>
			<Avatar size="lg" alt={profile.name} />
			<div class="min-w-0 flex-1">
				<h2 class="truncate text-lg font-medium">{profile.name}</h2>
				<p class="text-sm text-(--text)/48">Personal progress</p>
			</div>
		</header>

		<section class="grid grid-cols-3 gap-0 pt-2" aria-label="Game progress" data-user-card-item>
			<Button
				href="/achievements"
				variant="ghost"
				class="h-26 min-w-0 flex-col gap-2 rounded-l-3xl rounded-r-none px-1 text-white hover:text-white"
				style={`background: ${gameGradient(achievementColors)}`}
				aria-label={`${gamification.achievementCount} achievements completed`}
				onclick={onSelect}
			>
				<Trophy class="size-7" />
				<strong class="max-w-full truncate text-lg font-medium tabular-nums">
					{gamification.achievementCount}
				</strong>
			</Button>

			<Button
				href="/streaks"
				variant="ghost"
				class="h-26 min-w-0 flex-col gap-2 rounded-none px-1 text-white hover:text-white"
				style={`background: ${gameGradient(streakColors)}`}
				aria-label={`${gamification.dayStreak.current} day streak`}
				onclick={onSelect}
			>
				<Flame class="size-7" />
				<strong class="max-w-full truncate text-lg font-medium tabular-nums">
					{gamification.dayStreak.current}
				</strong>
			</Button>

			<Button
				href="/shop"
				variant="ghost"
				class="h-26 min-w-0 flex-col gap-2 rounded-l-none rounded-r-3xl px-1 text-white hover:text-white"
				style={`background: ${gameGradient(gamificationColors.glimmers)}`}
				aria-label={`${gamification.glimmers} Glimmers. Open shop.`}
				onclick={onSelect}
			>
				<Coins class="size-7" />
				<strong class="max-w-full truncate text-lg font-medium tabular-nums">
					{gamification.glimmers.toLocaleString()}
				</strong>
			</Button>
		</section>

		<div data-user-card-item>
			<AudioVolumeControl />
		</div>

		<Button
			href="/profile"
			variant="ghost"
			class="h-12 w-full gap-2 rounded-2xl bg-(--text)/4"
			data-user-card-item
			onclick={onSelect}
		>
			<Settings class="size-4" />
			Settings
		</Button>
	</div>
</div>
