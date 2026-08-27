<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import HappinessEntry from './components/happinessEntry.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Happiness tracker · Self Improvement</title>
	<meta name="description" content="Track daily happiness and the reasons behind it." />
</svelte:head>

<TrackerPage class="max-w-3xl">
	<HappinessEntry {data} />
</TrackerPage>
