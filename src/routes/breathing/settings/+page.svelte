<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Button } from '$lib/components/ui/button';
	import BreathingSettings from './breathingSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Breathing settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/breathing" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<BreathingSettings settings={data} trailing={actions} />
</TrackerPage>
