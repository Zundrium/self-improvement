<script lang="ts">
	import TrackerHistory from '$lib/components/trackerHistory.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { shortDayLabel } from '$lib/dateFormatting';
	import { getTrackerColors } from '$lib/trackers/registry';
	import StepsSummary from './components/stepsSummary.svelte';
	import { DEFAULT_STEP_GOAL } from './steps';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('steps');
	const dailyGoal = $derived(data.connection?.dailyGoal ?? DEFAULT_STEP_GOAL);
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

<TrackerPage class="max-w-3xl">
	<StepsSummary steps={data.steps} goal={dailyGoal} />
	<TrackerHistory items={history} {colors} />
</TrackerPage>
