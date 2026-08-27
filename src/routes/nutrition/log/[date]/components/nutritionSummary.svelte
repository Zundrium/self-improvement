<script lang="ts">
	import { onMount } from 'svelte';
	import { CircleCheck, CircleX, Droplet, Drumstick, Wheat } from '@lucide/svelte';
	import type { NutritionLogData, NutritionTotals } from '$lib/api-types';
	import MetricStat from '$lib/components/metricStat.svelte';
	import TrackerProgressSummary from '$lib/components/trackerProgressSummary.svelte';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { eatingWindowState } from './eatingWindow';

	type Props = {
		totals: NutritionTotals;
		goal: number;
		date: string;
		today: string;
		eatingWindow: NutritionLogData['eatingWindow'];
	};

	let { totals, goal, date, today, eatingWindow }: Props = $props();
	let now = $state(new Date());
	const colors = getTrackerColors('nutrition');
	const consumed = $derived(Math.round(totals.calories));
	const windowState = $derived(eatingWindow ? eatingWindowState(eatingWindow, now) : null);
	const showEatingWindow = $derived(Boolean(windowState) && date === today);

	onMount(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const updateNow = () => {
			now = new Date();
			timer = setTimeout(updateNow, millisecondsUntilNextMinute(now));
		};
		updateNow();
		return () => clearTimeout(timer);
	});

	function millisecondsUntilNextMinute(date: Date) {
		return 60_000 - date.getSeconds() * 1_000 - date.getMilliseconds();
	}
</script>

<section class="space-y-4 py-2" aria-label="Daily nutrition">
	{#if showEatingWindow && windowState}
		<div
			class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 {windowState.open
				? 'bg-green-500/10 text-green-700 dark:text-green-400'
				: 'bg-(--text)/6 text-(--text)/64'}"
			role="status"
			aria-live="polite"
		>
			{#if windowState.open}
				<CircleCheck class="size-5 shrink-0" aria-hidden="true" />
			{:else}
				<CircleX class="size-5 shrink-0" aria-hidden="true" />
			{/if}
			<div class="min-w-0 text-sm leading-5">
				<strong class="block font-medium">{windowState.status}</strong>
				<span class="block text-xs opacity-80">{windowState.schedule}</span>
			</div>
		</div>
	{/if}

	<div class="grid items-center gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
		<TrackerProgressSummary
			value={consumed}
			max={goal}
			displayValue={consumed.toLocaleString()}
			secondaryText={`/ ${goal.toLocaleString()} kcal`}
			label={`${consumed} of ${goal} calories consumed`}
			{colors}
		/>

		<div class="grid grid-cols-3 items-center">
			<MetricStat
				icon={Drumstick}
				value={`${totals.proteinG}g`}
				label="protein"
				iconClass="text-chart-2"
				boxed={false}
			/>
			<MetricStat
				icon={Wheat}
				value={`${totals.carbsG}g`}
				label="carbs"
				iconClass="text-chart-1"
				boxed={false}
			/>
			<MetricStat
				icon={Droplet}
				value={`${totals.fatG}g`}
				label="fat"
				iconClass="text-chart-3"
				boxed={false}
			/>
		</div>
	</div>
</section>
