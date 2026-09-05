<script lang="ts">
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import TrackerSections from '$lib/components/tracker/TrackerSections.svelte';
import PeriodEntrySection from './components/periodEntrySection.svelte';
import PeriodInsightsSections from './components/periodInsightsSections.svelte';
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
	<TrackerSections
		layout="columns"
		class="md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]"
	>
		<PeriodEntrySection {data} />
		<PeriodInsightsSections cycle={data.cycle} entries={data.recentEntries} today={data.today} />
	</TrackerSections>
</TrackerPage>
