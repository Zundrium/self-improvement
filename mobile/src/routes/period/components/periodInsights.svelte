<script lang="ts">
	import type { PeriodData } from '$lib/api-types';
	import TrackerHistoryItem from '$lib/components/trackerHistoryItem.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { shortDateLabel } from '$lib/dateFormatting';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { flowLabel } from '../period';

	let {
		cycle,
		entries,
		today
	}: {
		cycle: PeriodData['cycle'];
		entries: PeriodData['recentEntries'];
		today: string;
	} = $props();
	const colors = getTrackerColors('period');

	function href(date: string) {
		return date === today ? '/period' : `/period?date=${date}`;
	}
</script>

<div class="space-y-10">
	<TrackerSection title="Cycle overview" {colors}>
		{#if cycle}
			<div class="space-y-4 text-sm">
				<div class="flex items-center justify-between gap-4">
					<span class="text-(--text)/56">Last period started</span>
					<strong>{shortDateLabel(cycle.lastPeriodStarted)}</strong>
				</div>
				<div class="flex items-center justify-between gap-4">
					<span class="text-(--text)/56">Estimated next period</span>
					<strong>{shortDateLabel(cycle.estimatedNextPeriod)}</strong>
				</div>
				<div class="flex items-center justify-between gap-4">
					<span class="text-(--text)/56">
						{cycle.averageFromHistory ? 'Average cycle' : 'Starting estimate'}
					</span>
					<strong>{cycle.averageCycleDays} days</strong>
				</div>
			</div>
			<p class="mt-4 text-xs leading-5 text-(--text)/40">
				Estimates are based only on saved entries and are not medical advice.
			</p>
		{:else}
			<p class="text-sm leading-6 text-(--text)/56">
				Save your first day to begin building a cycle history.
			</p>
		{/if}
	</TrackerSection>

	<TrackerSection title="Recent entries" {colors}>
		{#if entries.length}
			<div class="space-y-1">
				{#each entries as entry (entry.localDate)}
					<TrackerHistoryItem
						href={href(entry.localDate)}
						label={shortDateLabel(entry.localDate)}
						value={flowLabel(entry.flow)}
					/>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-(--text)/56">No period entries yet.</p>
		{/if}
	</TrackerSection>
</div>
