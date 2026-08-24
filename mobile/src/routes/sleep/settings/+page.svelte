<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { getTrackerColors } from '$lib/trackers/registry';
	import BedtimeSettings from '../components/bedtimeSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('sleep');
</script>

<svelte:head><title>Sleep settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<TrackerSection title="Bedtime" description="Set tonight’s cutoff and optional reminder" {colors}>
		<BedtimeSettings settings={data.settings} />
	</TrackerSection>
</TrackerPage>
