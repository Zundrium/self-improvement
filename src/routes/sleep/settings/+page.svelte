<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getTrackerColors } from '$lib/trackers/registry';
	import BedtimeSettings from '../components/bedtimeSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('sleep');
</script>

<svelte:head><title>Sleep settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/sleep" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<TrackerSection
		title="Bedtime"
		description="Set tonight’s cutoff and optional reminder."
		{colors}
		trailing={actions}
	>
		<BedtimeSettings settings={data.settings} />
	</TrackerSection>
</TrackerPage>
