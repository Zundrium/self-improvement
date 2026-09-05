<script lang="ts">
import { CircleAlert } from '@lucide/svelte';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
</script>

<TrackerSection ariaLabel="Screen-time setup">
	<Alert>
		<CircleAlert />
		<AlertTitle>No apps selected</AlertTitle>
		<AlertDescription>Choose at least one app to start measuring screen time.</AlertDescription>
		<div class="col-start-2 mt-2">
			<Button href="/screen-time/settings" size="small" profile="plain">Choose apps</Button>
		</div>
	</Alert>
</TrackerSection>
