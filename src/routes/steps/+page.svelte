<script lang="ts">
import NativeDataHelpSection from '$lib/components/tracker/NativeDataHelpSection.svelte';
import TrackerHistorySection from '$lib/components/tracker/TrackerHistorySection.svelte';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { shortDayLabel } from '$lib/dateFormatting';
import { getTrackerColors } from '$lib/trackers/registry';
import StepsSummarySection from './components/stepsSummarySection.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
const colors = getTrackerColors('steps');
const dailyGoal = $derived(data.settings.dailyGoal);
const history = $derived(
	data.days.map((day) => ({
		key: day.date,
		label: shortDayLabel(day.date, data.today),
		value: day.count,
		max: dailyGoal,
		displayValue: day.count.toLocaleString()
	}))
);
</script>

<svelte:head>
	<title>Steps · Self Improvement</title>
	<meta name="description" content="Track daily steps from Android Health Connect." />
</svelte:head>

<TrackerPage
	class="max-w-3xl"
	progress={{
		mode: 'line',
		days: data.progressDays,
		maxValue: dailyGoal,
		ariaLabel: 'Five-day step progress'
	}}
>
	<StepsSummarySection steps={data.steps} goal={dailyGoal} />
	{#if !data.hasData}<NativeDataHelpSection tracker="steps" isSynced={data.isSynced} />{/if}
	<TrackerHistorySection items={history} {colors} />
</TrackerPage>
