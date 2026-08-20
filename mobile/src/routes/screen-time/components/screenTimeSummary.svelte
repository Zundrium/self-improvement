<script lang="ts">
	import TrackerProgressSummary from '$lib/components/trackerProgressSummary.svelte';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { DEFAULT_SCREEN_TIME_LIMIT_MINUTES, formatScreenTime } from '../screen-time';

	let { totalMinutes }: { totalMinutes: number } = $props();
	const colors = getTrackerColors('screen-time');
</script>

<TrackerProgressSummary
	value={totalMinutes}
	max={DEFAULT_SCREEN_TIME_LIMIT_MINUTES}
	displayValue={formatScreenTime(totalMinutes)}
	secondaryText={`/ ${formatScreenTime(DEFAULT_SCREEN_TIME_LIMIT_MINUTES)}`}
	label={`${totalMinutes} screen-time minutes`}
	{colors}
/>
