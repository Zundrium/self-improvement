<script lang="ts">
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import MeditationSettings from './meditationSettings.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head><title>Meditation settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-5">
	<MeditationSettings settings={data} />
</TrackerPage>
