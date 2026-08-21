<script lang="ts">
	import { LockKeyhole, Trophy } from '@lucide/svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { getTrackerColors } from '$lib/trackers/registry';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('achievements');
</script>

<svelte:head>
	<title>Achievements · Self Improvement</title>
	<meta name="description" content="View unlocked achievements and personal progress." />
</svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-6">
	{#each data.achievements as achievement (achievement.id)}
		<div class:opacity-40={!achievement.unlocked}>
			<div class="flex items-start gap-4">
				<span
					class="flex size-10 shrink-0 items-center justify-center"
					style={`color: ${colors.primary}`}
				>
					{#if achievement.unlocked}
						<Trophy class="size-7" />
					{:else}
						<LockKeyhole class="size-6" />
					{/if}
				</span>
				<div class="min-w-0 flex-1">
					<div class="flex items-baseline justify-between gap-3">
						<h2 class="text-sm font-medium">{achievement.title}</h2>
						<span class="text-xs text-(--text)/48 tabular-nums">
							{Math.min(achievement.progress, achievement.target)}/{achievement.target}
						</span>
					</div>
					<p class="mt-0.5 text-sm leading-5 text-(--text)/52">{achievement.description}</p>
					{#if !achievement.unlocked}
						<Progress
							class="mt-3 h-1.5"
							value={Math.min(achievement.progress, achievement.target)}
							max={achievement.target}
							indicatorStyle={`background: ${colors.primary}`}
						/>
					{/if}
				</div>
			</div>
		</div>
	{/each}
</TrackerPage>
