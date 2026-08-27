<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Button } from '$lib/components/ui/button';
	import MeditationSettings from './meditationSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Meditation settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/meditation" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<MeditationSettings settings={data} trailing={actions} />
</TrackerPage>
