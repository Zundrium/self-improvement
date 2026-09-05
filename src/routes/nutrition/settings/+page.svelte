<script lang="ts">
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import NutritionSettings from './nutritionSettings.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head><title>Nutrition settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-3xl" contentClass="space-y-5">
	<NutritionSettings profile={data.nutritionProfile} estimatedTdee={data.estimatedTdee} />
</TrackerPage>
