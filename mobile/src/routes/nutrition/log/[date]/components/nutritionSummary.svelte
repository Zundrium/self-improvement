<script lang="ts">
	import { Droplet, Drumstick, Wheat } from '@lucide/svelte';
	import type { NutritionTotals } from '$lib/api-types';
	import MetricStat from '$lib/components/metricStat.svelte';
	import TrackerProgressSummary from '$lib/components/trackerProgressSummary.svelte';
	import { getTrackerColors } from '$lib/trackers/registry';

	type Props = {
		totals: NutritionTotals;
		goal: number;
	};

	let { totals, goal }: Props = $props();
	const colors = getTrackerColors('nutrition');
	const consumed = $derived(Math.round(totals.calories));
</script>

<section
	class="grid items-center gap-6 py-2 lg:grid-cols-[1.35fr_1fr] lg:gap-12"
	aria-label="Daily nutrition"
>
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
</section>
