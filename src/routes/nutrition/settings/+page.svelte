<script lang="ts">
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { getTrackerColors } from '$lib/trackers/registry';
	import NutritionSettings from './nutritionSettings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = getTrackerColors('nutrition');
</script>

<svelte:head><title>Nutrition settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-3xl" contentClass="space-y-8">
	<TrackerSection
		title="Nutrition goals"
		description="Set your daily calorie target and optional eating window."
		{colors}
	>
		<NutritionSettings profile={data.nutritionProfile} estimatedTdee={data.estimatedTdee} />
	</TrackerSection>
</TrackerPage>
