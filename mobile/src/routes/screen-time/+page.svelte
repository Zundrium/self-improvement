<script lang="ts">
	import TrackerHistory from '$lib/components/trackerHistory.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { shortDayLabel } from '$lib/dateFormatting';
	import { getTrackerColors } from '$lib/trackers/registry';
	import ScreenTimeSummary from './components/screenTimeSummary.svelte';
	import { DEFAULT_SCREEN_TIME_LIMIT_MINUTES, formatScreenTime } from './screen-time';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('screen-time');
	const history = $derived(
		data.days.map((day) => ({
			key: day.date,
			label: shortDayLabel(day.date, data.today),
			value: day.totalMinutes,
			max: DEFAULT_SCREEN_TIME_LIMIT_MINUTES,
			displayValue: formatScreenTime(day.totalMinutes)
		}))
	);
</script>

<svelte:head>
	<title>Screen Time · Self Improvement</title>
	<meta name="description" content="Track daily Android screen time and per-app usage." />
</svelte:head>

<TrackerPage class="max-w-3xl">
	<ScreenTimeSummary totalMinutes={data.usage.totalMinutes} />
	<TrackerHistory items={history} {colors} />
</TrackerPage>
