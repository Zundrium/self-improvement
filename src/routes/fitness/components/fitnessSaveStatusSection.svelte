<script lang="ts">
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { Alert, AlertDescription } from '$lib/components/ui/alert';

let { message }: { message: string } = $props();
</script>

<TrackerSection ariaLabel="Fitness save status">
	<Alert variant="destructive">
		<AlertDescription>{message}</AlertDescription>
	</Alert>
</TrackerSection>
