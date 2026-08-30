<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import DefaultSetsSettings from './defaultSetsSettings.svelte';
	import ExerciseSpeedSettings from './exerciseSpeedSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Fitness settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-6xl" contentClass="space-y-8">
	<DefaultSetsSettings settings={data.settings} />
	<ExerciseSpeedSettings exercises={data.exercises} />
</TrackerPage>
