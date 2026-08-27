<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Button } from '$lib/components/ui/button';
	import ScreenTimeApps from '../components/screenTimeApps.svelte';
	import ScreenTimeSettings from './screenTimeSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Screen time settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/screen-time" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<ScreenTimeSettings settings={data.settings} trailing={actions} />
	<ScreenTimeApps apps={data.apps} knownApps={data.knownApps} />
</TrackerPage>
