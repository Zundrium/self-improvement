<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import ScreenTimeApps from '../components/screenTimeApps.svelte';
	import ScreenTimeSettings from './screenTimeSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Screen time settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-5">
	<ScreenTimeSettings settings={data.settings} />
	<ScreenTimeApps apps={data.apps} knownApps={data.knownApps} />
</TrackerPage>
