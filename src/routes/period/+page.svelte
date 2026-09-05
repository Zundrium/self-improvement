<script lang="ts">
import TrackerColumns from '$lib/components/tracker/TrackerColumns.svelte';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import PeriodEntry from './components/periodEntry.svelte';
import PeriodInsights from './components/periodInsights.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Period tracker · Self Improvement</title>
	<meta name="description" content="Track menstruation flow, notes, and cycle history." />
</svelte:head>

<TrackerPage
	class="max-w-4xl"
	progress={{
		mode: 'line',
		days: data.progressDays,
		maxValue: 4,
		ariaLabel: 'Five-day period flow progress'
	}}
>
	<TrackerColumns class="md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
		<PeriodEntry {data} />
		<PeriodInsights cycle={data.cycle} entries={data.recentEntries} today={data.today} />
	</TrackerColumns>
</TrackerPage>
