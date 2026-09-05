<script lang="ts">
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

let { lastProcessed }: { lastProcessed: string } = $props();
</script>

<TrackerSection ariaLabel="Android data status">
	<Alert>
		<AlertTitle>Android data processed</AlertTitle>
		<AlertDescription>Last sync: {lastProcessed}</AlertDescription>
	</Alert>
</TrackerSection>
