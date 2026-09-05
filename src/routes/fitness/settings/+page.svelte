<script lang="ts">
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import DefaultSetsSettings from './defaultSetsSettings.svelte';
import ExerciseSpeedSettings from './exerciseSpeedSettings.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head><title>Fitness settings · Self Improvement</title></svelte:head>

<TrackerPage contentClass="space-y-5">
	<DefaultSetsSettings settings={data.settings} />
	<ExerciseSpeedSettings exercises={data.exercises} />
</TrackerPage>
