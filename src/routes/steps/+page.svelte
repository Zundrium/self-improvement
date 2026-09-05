<script lang="ts">
import NativeDataHelpAlert from '$lib/components/tracker/NativeDataHelpAlert.svelte';
import TrackerHistory from '$lib/components/tracker/TrackerHistory.svelte';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { shortDayLabel } from '$lib/dateFormatting';
import { getTrackerColors } from '$lib/trackers/registry';
import StepsSummary from './components/stepsSummary.svelte';
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
	<StepsSummary steps={data.steps} goal={dailyGoal} />
	{#if !data.hasData}<NativeDataHelpAlert tracker="steps" isSynced={data.isSynced} />{/if}
	<TrackerHistory items={history} {colors} />
</TrackerPage>
