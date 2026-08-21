<script lang="ts">
	import NativeDataHelpAlert from '$lib/components/nativeDataHelpAlert.svelte';
	import TrackerHistory from '$lib/components/trackerHistory.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { shortDayLabel } from '$lib/dateFormatting';
	import { getTrackerColors } from '$lib/trackers/registry';
	import SleepSummary from './components/sleepSummary.svelte';
	import { DEFAULT_SLEEP_GOAL_MINUTES, formatSleepMinutes } from './sleep';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('sleep');
	const dailyGoalMinutes = $derived(
		data.connection?.dailyGoalMinutes ?? DEFAULT_SLEEP_GOAL_MINUTES
	);
	const selectedMinutes = $derived(Math.round(data.durationSeconds / 60));
	const history = $derived(
		data.days.map((day) => {
			const minutes = Math.round(day.durationSeconds / 60);
			return {
				key: day.date,
				label: shortDayLabel(day.date, data.today),
				value: minutes,
				max: dailyGoalMinutes,
				displayValue: formatSleepMinutes(minutes)
			};
		})
	);
</script>

<svelte:head>
	<title>Sleep · Self Improvement</title>
	<meta name="description" content="Track daily sleep from Android Health Connect." />
</svelte:head>

<TrackerPage class="max-w-3xl">
	<SleepSummary minutes={selectedMinutes} goal={dailyGoalMinutes} />
	{#if !data.hasData}<NativeDataHelpAlert tracker="sleep" isSynced={data.isSynced} />{/if}
	<TrackerHistory items={history} {colors} />
</TrackerPage>
