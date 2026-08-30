<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import MeditationSettings from './meditationSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Meditation settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<MeditationSettings settings={data} />
</TrackerPage>
