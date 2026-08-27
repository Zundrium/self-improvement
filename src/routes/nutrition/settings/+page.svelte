<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getTrackerColors } from '$lib/trackers/registry';
	import NutritionSettings from './nutritionSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('nutrition');
</script>

<svelte:head><title>Nutrition settings · Self Improvement</title></svelte:head>

{#snippet actions()}
	<Button href="/nutrition/log/today" variant="ghost">Back</Button>
{/snippet}

<TrackerPage class="max-w-3xl" contentClass="space-y-8">
	<TrackerSection
		title="Nutrition goals"
		description="Set your daily calorie target and optional eating window."
		{colors}
		trailing={actions}
	>
		<NutritionSettings profile={data.nutritionProfile} estimatedTdee={data.estimatedTdee} />
	</TrackerSection>
</TrackerPage>
