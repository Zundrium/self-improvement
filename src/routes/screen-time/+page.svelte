<script lang="ts">
	import { CircleAlert } from '@lucide/svelte';
	import NativeDataHelpAlert from '$lib/components/nativeDataHelpAlert.svelte';
	import TrackerHistory from '$lib/components/trackerHistory.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { shortDayLabel } from '$lib/dateFormatting';
	import { getTrackerColors } from '$lib/trackers/registry';
	import ScreenTimeSummary from './components/screenTimeSummary.svelte';
	import { formatScreenTime, hasTrackedApps } from './screen-time';
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
			max: data.settings.dailyLimitMinutes,
			displayValue: formatScreenTime(day.totalMinutes)
		}))
	);
</script>

<svelte:head>
	<title>Screen Time · Self Improvement</title>
	<meta name="description" content="Track daily Android screen time and per-app usage." />
</svelte:head>

<TrackerPage class="max-w-3xl">
	<ScreenTimeSummary totalMinutes={data.usage.totalMinutes} limit={data.settings.dailyLimitMinutes} />
	{#if !hasTrackedApps(data.knownApps)}
		<Alert>
			<CircleAlert />
			<AlertTitle>No apps selected</AlertTitle>
			<AlertDescription>Choose at least one app to start measuring screen time.</AlertDescription>
			<div class="col-start-2 mt-2">
				<Button href="/screen-time/settings" size="small" variant="ghost">Choose apps</Button>
			</div>
		</Alert>
	{/if}
	{#if data.hasData}
		<Alert>
			<AlertTitle>Android data processed</AlertTitle>
			<AlertDescription>Last sync: {lastProcessed}</AlertDescription>
		</Alert>
	{:else}
		<NativeDataHelpAlert tracker="screen-time" isSynced={data.isSynced} />
	{/if}
	<TrackerHistory items={history} {colors} />
</TrackerPage>
