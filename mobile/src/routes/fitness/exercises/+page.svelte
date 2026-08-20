<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import ExerciseSpeedSettings from './components/exerciseSpeedSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Rep speeds · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-6xl">
	<ExerciseSpeedSettings exercises={data.exercises} />
</TrackerPage>
