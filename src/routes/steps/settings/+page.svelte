<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Button } from '$lib/components/ui/button';
	import StepsSettings from './stepsSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Steps settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/steps" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<StepsSettings settings={data} trailing={actions} />
</TrackerPage>
