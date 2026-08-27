<script lang="ts">
import TrackerPage from '$lib/components/trackerPage.svelte';
import { Button } from '$lib/components/ui/button';
import StretchSettings from './stretchSettings.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head><title>Stretch settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/stretch" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<StretchSettings settings={data} trailing={actions} />
</TrackerPage>
