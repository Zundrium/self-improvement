<script lang="ts">
import NativeDataHelpSection from '$lib/components/tracker/NativeDataHelpSection.svelte';
import TrackerHistorySection from '$lib/components/tracker/TrackerHistorySection.svelte';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { shortDayLabel } from '$lib/dateFormatting';
import { getTrackerColors } from '$lib/trackers/registry';
import ScreenTimeSetupSection from './components/screenTimeSetupSection.svelte';
import ScreenTimeSummarySection from './components/screenTimeSummarySection.svelte';
import ScreenTimeSyncSection from './components/screenTimeSyncSection.svelte';
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

<TrackerPage
	class="max-w-3xl"
	progress={{
		mode: 'line',
		days: data.progressDays,
		maxValue: data.settings.dailyLimitMinutes,
		ariaLabel: 'Five-day screen-time progress'
	}}
>
	<ScreenTimeSummarySection
		totalMinutes={data.usage.totalMinutes}
		limit={data.settings.dailyLimitMinutes}
	/>
	{#if !hasTrackedApps(data.knownApps)}
		<ScreenTimeSetupSection />
	{/if}
	{#if data.hasData}
		<ScreenTimeSyncSection {lastProcessed} />
	{:else}
		<NativeDataHelpSection tracker="screen-time" isSynced={data.isSynced} />
	{/if}
	<TrackerHistorySection items={history} {colors} />
</TrackerPage>
