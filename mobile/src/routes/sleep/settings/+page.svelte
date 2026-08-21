<script lang="ts">
	import SleepGoalEditor from '../components/sleepGoalEditor.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Sleep settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-4">
	<Card>
		<CardHeader><CardTitle>Daily sleep goal</CardTitle></CardHeader>
		<CardContent class="space-y-4">
			<p class="text-sm leading-6 text-(--text)/64">
				Set the target used by sleep progress and daily completion.
			</p>
			<SleepGoalEditor goal={data.goal} />
		</CardContent>
	</Card>
</TrackerPage>
