<script lang="ts">
import TrackerPage from '$lib/components/trackerPage.svelte';
import StretchSettings from './stretchSettings.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head><title>Stretch settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-5">
	<StretchSettings settings={data} />
</TrackerPage>
