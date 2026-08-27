<script lang="ts">
	import NativeDataHelpAlert from '$lib/components/nativeDataHelpAlert.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import BedtimeHistory from './components/bedtimeHistory.svelte';
	import BedtimeStatus from './components/bedtimeStatus.svelte';
	import LateActivity from './components/lateActivity.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Sleep · Self Improvement</title>
	<meta name="description" content="Protect bedtime by limiting selected-app activity." />
</svelte:head>

<TrackerPage class="max-w-3xl" contentClass="space-y-8">
	<BedtimeStatus
		summary={data.summary}
		setupRequired={data.setupRequired}
		isToday={data.date === data.today}
	/>
	{#if !data.hasData && !data.setupRequired}
		<NativeDataHelpAlert tracker="sleep" isSynced={data.isSynced} />
	{/if}
	<LateActivity summary={data.summary} setupRequired={data.setupRequired} />
	<BedtimeHistory days={data.days} today={data.today} setupRequired={data.setupRequired} />
</TrackerPage>
