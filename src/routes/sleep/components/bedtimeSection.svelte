<script lang="ts">
import { Moon } from '@lucide/svelte';
import { onMount } from 'svelte';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { getTrackerColors } from '$lib/trackers/registry';
import { formatBedtime, formatSleepTrackerMessage, isWithinSleepingWindow } from '../sleep';

let { bedtime }: { bedtime: string } = $props();
const colors = getTrackerColors('sleep');
let now = $state(new Date());
const shouldBeSleeping = $derived(isWithinSleepingWindow(bedtime, now));
const sleepMessage = $derived(formatSleepTrackerMessage(bedtime, now));

onMount(() => {
	const interval = window.setInterval(() => (now = new Date()), 30_000);
	return () => window.clearInterval(interval);
});
</script>

<TrackerSection ariaLabel="Bedtime" class="pb-8 text-center">
	<Moon
		class="mx-auto mb-6 size-56 sm:size-64"
		color={colors.primary}
		strokeWidth={1.5}
		aria-hidden="true"
	/>
	<p class="text-4xl leading-tight font-medium tracking-[-0.055em] tabular-nums sm:text-5xl">
		{sleepMessage}
	</p>
	{#if !shouldBeSleeping}
		<p class="mt-3 text-sm text-(--text-muted)">until bedtime</p>
	{/if}
	<time class="mt-1 block text-sm font-medium tabular-nums" datetime={bedtime}>
		{formatBedtime(bedtime)}
	</time>
</TrackerSection>
