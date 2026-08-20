<script lang="ts">
	import CircularProgress from '$lib/components/circularProgress.svelte';
	import MetricProgressRow from '$lib/components/metricProgressRow.svelte';
	import { shortDayLabel } from '$lib/dateFormatting';
	import { DEFAULT_STEP_GOAL } from './steps';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const dailyGoal = $derived(data.connection?.dailyGoal ?? DEFAULT_STEP_GOAL);
</script>

<svelte:head>
	<title>Steps · Self Improvement</title>
	<meta name="description" content="Track daily steps from Android Health Connect." />
</svelte:head>

<main class="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	<section class="flex items-center justify-center py-2">
		<div class="flex flex-col items-center py-4 sm:py-6">
			<CircularProgress
				value={data.steps}
				max={dailyGoal}
				label={`${data.steps} of ${dailyGoal} steps`}
			>
				<strong class="block text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl">
					{data.steps.toLocaleString()}
				</strong>
				<span class="mt-2 block text-sm text-(--text)/48 tabular-nums">
					/ {dailyGoal.toLocaleString()} steps
				</span>
			</CircularProgress>
		</div>
	</section>

	<section class="mx-auto max-w-3xl space-y-5" aria-labelledby="step-history-title">
		<h1 id="step-history-title" class="text-xl font-medium">Last 7 days</h1>
		<div class="space-y-4">
			{#each data.days as day (day.date)}
				<MetricProgressRow
					label={shortDayLabel(day.date, data.today)}
					value={day.count}
					max={dailyGoal}
					displayValue={day.count.toLocaleString()}
				/>
			{/each}
		</div>
	</section>
</main>
