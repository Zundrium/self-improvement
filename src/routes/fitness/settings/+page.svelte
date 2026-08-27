<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Button } from '$lib/components/ui/button';
	import DefaultSetsSettings from './defaultSetsSettings.svelte';
	import ExerciseSpeedSettings from './exerciseSpeedSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Fitness settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/fitness" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-6xl" contentClass="space-y-10">
	<DefaultSetsSettings settings={data.settings} trailing={actions} />
	<ExerciseSpeedSettings exercises={data.exercises} />
</TrackerPage>
