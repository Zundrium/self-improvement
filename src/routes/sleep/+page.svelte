<script lang="ts">
import { Moon } from '@lucide/svelte';
import { onMount } from 'svelte';
import TrackerPage from '$lib/components/trackerPage.svelte';
import { getTrackerColors } from '$lib/trackers/registry';
import {
	formatBedtime,
	formatSleepTrackerMessage,
	isWithinSleepingWindow
} from './sleep';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
const colors = getTrackerColors('sleep');
let now = $state(new Date());
const shouldBeSleeping = $derived(isWithinSleepingWindow(data.bedtime, now));
const sleepMessage = $derived(formatSleepTrackerMessage(data.bedtime, now));

onMount(() => {
	const interval = window.setInterval(() => (now = new Date()), 30_000);
	return () => window.clearInterval(interval);
});
</script>

<svelte:head>
	<title>Sleep · Self Improvement</title>
	<meta name="description" content="Keep your bedtime in view." />
</svelte:head>

<TrackerPage
	class="flex max-w-(--app-compact-max-width) flex-col"
	contentClass="flex flex-1 items-center justify-center"
	progress={{
		mode: 'check',
		days: data.progressDays,
		ariaLabel: 'Five-day bedtime progress'
	}}
>
	<section class="pb-8 text-center" aria-label="Bedtime" data-motion-item>
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
			<p class="mt-3 text-sm text-(--text)/48">until bedtime</p>
		{/if}
		<time class="mt-1 block text-sm font-medium tabular-nums" datetime={data.bedtime}>
			{formatBedtime(data.bedtime)}
		</time>
	</section>
</TrackerPage>
