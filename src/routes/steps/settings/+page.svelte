<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import StepsSettings from './stepsSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Steps settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<StepsSettings settings={data} />
</TrackerPage>
