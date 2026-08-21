<script lang="ts">
	import { CircleAlert } from '@lucide/svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';

	type NativeTracker = 'steps' | 'sleep' | 'screen-time';
	type Props = { tracker: NativeTracker; isSynced: boolean };

	let { tracker, isSynced }: Props = $props();
	const labels: Record<NativeTracker, string> = {
		steps: 'step',
		sleep: 'sleep',
		'screen-time': 'screen-time'
	};
	const label = $derived(labels[tracker]);
</script>

<Alert variant="destructive">
	<CircleAlert />
	<AlertTitle>No recent {label} data found</AlertTitle>
	<AlertDescription>
		{#if isSynced}
			Android completed an upload, but its data provider returned no usable measurements.
		{:else}
			This tracker has not completed its first Android upload.
		{/if}
	</AlertDescription>
	<div class="col-start-2 mt-2">
		<Button href="/android-data-help" size="sm" variant="ghost">Check Android connection</Button>
	</div>
</Alert>
