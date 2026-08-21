<script lang="ts">
	import NativeDataHelpAlert from '$lib/components/nativeDataHelpAlert.svelte';
	import TrackerHistory from '$lib/components/trackerHistory.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { shortDayLabel } from '$lib/dateFormatting';
	import { getTrackerColors } from '$lib/trackers/registry';
	import ScreenTimeApps from './components/screenTimeApps.svelte';
	import ScreenTimeSummary from './components/screenTimeSummary.svelte';
	import { DEFAULT_SCREEN_TIME_LIMIT_MINUTES, formatScreenTime } from './screen-time';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('screen-time');
	const lastProcessed = $derived(
		data.connection?.lastReceivedAt
			? new Date(data.connection.lastReceivedAt).toLocaleString()
			: 'Not synced yet'
	);
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
	{#if data.hasData}
		<Alert>
			<AlertTitle>Android data processed</AlertTitle>
			<AlertDescription>Last sync: {lastProcessed}</AlertDescription>
		</Alert>
	{:else}
		<NativeDataHelpAlert tracker="screen-time" isSynced={data.isSynced} />
	{/if}
	<TrackerHistory items={history} {colors} />
	<ScreenTimeApps apps={data.usage.apps} totalMinutes={data.usage.totalMinutes} />
</TrackerPage>
