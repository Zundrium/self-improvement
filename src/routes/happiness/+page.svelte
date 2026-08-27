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

<TrackerPage
	class="flex min-h-0 max-w-3xl flex-col"
	contentClass="flex min-h-0 flex-1 flex-col justify-center space-y-0"
>
	<HappinessEntry {data} />
</TrackerPage>
