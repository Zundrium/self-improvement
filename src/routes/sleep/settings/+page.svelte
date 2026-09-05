<script lang="ts">
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import BedtimeSettings from '../components/bedtimeSettings.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head><title>Sleep settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-5">
	<Card>
		<CardHeader><CardTitle>Bedtime</CardTitle></CardHeader>
		<CardContent>
			<BedtimeSettings settings={data.settings} />
		</CardContent>
	</Card>
</TrackerPage>
