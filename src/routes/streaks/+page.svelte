<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerProgressSummary from '$lib/components/trackerProgressSummary.svelte';
	import { trackerIcons } from '$lib/trackers/icons';
	import { getTrackerColors } from '$lib/trackers/registry';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('streaks');
	const nextDayMilestone = $derived(Math.max(5, Math.ceil((data.dayStreak.current + 1) / 5) * 5));
</script>

<svelte:head>
	<title>Streaks · Self Improvement</title>
	<meta name="description" content="View current and best streaks for active trackers." />
</svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<div class="space-y-2">
		<TrackerProgressSummary
			value={data.dayStreak.current}
			max={nextDayMilestone}
			displayValue={data.dayStreak.current.toString()}
			secondaryText="day streak"
			label="Day streak"
			{colors}
		/>
		<p class="text-center text-sm text-(--text)/48 tabular-nums">Best {data.dayStreak.best}</p>
	</div>

	<section class="space-y-6" aria-label="Tracker streaks">
		{#each data.streaks as streak (streak.trackerId)}
			{@const TrackerIcon = trackerIcons[streak.trackerId]}
			{@const trackerColors = getTrackerColors(streak.trackerId)}
			<div class="grid grid-cols-[1fr_2.75rem_1fr] items-center gap-4">
				<span
					class="dynamic-color flex size-11 items-center justify-center justify-self-end"
					style:--dynamic-color={trackerColors.primary}
				>
					<TrackerIcon class="size-8" />
				</span>
				<strong
					class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-(--text)/6 text-xl font-medium tracking-[-0.05em] tabular-nums"
				>
					{streak.current}
				</strong>
				<div class="min-w-0">
					<h2 class="truncate text-sm font-medium">{streak.label}</h2>
					<p class="mt-0.5 text-xs text-(--text)/48">Best {streak.best}</p>
				</div>
			</div>
		{:else}
			<p class="text-sm text-(--text)/56">Choose at least one tracker in Profile.</p>
		{/each}
	</section>
</TrackerPage>
