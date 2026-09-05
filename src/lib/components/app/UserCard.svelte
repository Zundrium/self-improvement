<script lang="ts">
import { Flame, Settings, Trophy } from '@lucide/svelte';
import type { GamificationData, LocalProfile } from '$lib/api-types';
import { staggerChildren } from '$lib/motion/gsap';
import { getTrackerColors } from '$lib/trackers/registry';
import { Avatar } from '$lib/components/ui/avatar/index';
import { Button } from '$lib/components/ui/button/index';
import { Pressable } from '$lib/components/ui/pressable/index';
import AudioVolumeControl from '$lib/components/app/AudioVolumeControl.svelte';
import GameCoinIcon from '$lib/components/gamification/GameCoinIcon.svelte';
import GlimmerIcon from '$lib/components/gamification/GlimmerIcon.svelte';

type Props = {
	profile: LocalProfile;
	gamification: GamificationData;
	onSelect?: () => void;
};

let { profile, gamification, onSelect }: Props = $props();
const achievementColors = getTrackerColors('achievements');
const streakColors = getTrackerColors('streaks');
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
				<p class="text-sm text-(--text-muted)">Personal progress</p>
			</div>
		</header>

		<section
			class="grid grid-cols-3 overflow-hidden rounded-3xl"
			aria-label="Game progress"
			data-user-card-item
		>
			<Pressable
				href="/achievements"
				class="h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-none bg-(--bg-elevated) px-1 text-center text-(--text) hover:bg-(--text)/4 hover:text-(--text)"
				aria-label={`${gamification.achievementCount} achievements completed`}
				onclick={onSelect}
			>
				<GameCoinIcon colors={achievementColors} class="size-10" aria-hidden="true">
					<Trophy class="size-5" />
				</GameCoinIcon>
				<strong class="max-w-full truncate text-lg font-medium tabular-nums">
					{gamification.achievementCount}
				</strong>
			</Pressable>

			<Pressable
				href="/streaks"
				class="h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-none bg-(--bg-elevated) px-1 text-center text-(--text) hover:bg-(--text)/4 hover:text-(--text)"
				aria-label={`${gamification.dayStreak.current} day streak`}
				onclick={onSelect}
			>
				<GameCoinIcon colors={streakColors} class="size-10" aria-hidden="true">
					<Flame class="size-5" />
				</GameCoinIcon>
				<strong class="max-w-full truncate text-lg font-medium tabular-nums">
					{gamification.dayStreak.current}
				</strong>
			</Pressable>

			<Pressable
				href="/shop"
				class="h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-none bg-(--bg-elevated) px-1 text-center text-(--text) hover:bg-(--text)/4 hover:text-(--text)"
				aria-label={`${gamification.glimmers} Glimmers. Open shop.`}
				onclick={onSelect}
			>
				<GlimmerIcon class="size-10" aria-hidden="true" />
				<strong class="max-w-full truncate text-lg font-medium tabular-nums">
					{gamification.glimmers.toLocaleString()}
				</strong>
			</Pressable>
		</section>

		<div data-user-card-item>
			<AudioVolumeControl />
		</div>

		<Button
			href="/profile"
			profile="plain"
			size="large"
			class="w-full gap-2"
			data-user-card-item
			onclick={onSelect}
		>
			<Settings class="size-4" />
			Settings
		</Button>
	</div>
</div>
