<script lang="ts">
	import { Camera } from '@lucide/svelte';
	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Button } from '$lib/components/ui/button';
	import { fullDateLabel } from '$lib/dateFormatting';
	import FoodLog from './components/foodLog.svelte';
	import NutritionSummary from './components/nutritionSummary.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{fullDateLabel(data.date)} · Self Improvement</title></svelte:head>

<TrackerPage>
	<NutritionSummary totals={data.totals} goal={data.calorieGoal} />
	<FoodLog entries={data.entries} />
</TrackerPage>

<BottomActionBar contentClass="max-w-5xl" mobileOnly={false}>
	<Button href="/nutrition/track?date={data.date}" size="lg" class="w-full">
		<Camera class="mr-2 size-5" /> Add a meal
	</Button>
</BottomActionBar>
