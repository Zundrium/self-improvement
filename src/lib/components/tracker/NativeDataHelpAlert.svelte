<script lang="ts">
import { CircleAlert } from '@lucide/svelte';
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index';
import { Button } from '$lib/components/ui/button/index';
import { permissionsSettingsHref } from '$lib/permissions';

type NativeTracker = 'steps' | 'sleep' | 'screen-time';
type Props = { tracker: NativeTracker; isSynced: boolean };

let { tracker, isSynced }: Props = $props();
const labels: Record<NativeTracker, string> = {
	steps: 'step',
	sleep: 'bedtime activity',
	'screen-time': 'screen time'
};
const label = $derived(labels[tracker]);
</script>

<Alert variant="destructive">
	<CircleAlert />
	<AlertTitle>No recent {label} data found</AlertTitle>
	<AlertDescription>
		{#if isSynced}
			Android data was processed, but this tracker has no usable summary yet.
		{:else}
			This tracker has not completed its first on-device processing run.
		{/if}
	</AlertDescription>
	<div class="col-start-2 mt-2">
		<Button
			href={permissionsSettingsHref(tracker === 'screen-time' ? 'screenTime' : tracker)}
			size="small"
			profile="plain"
		>
			Review data access
		</Button>
	</div>
</Alert>
