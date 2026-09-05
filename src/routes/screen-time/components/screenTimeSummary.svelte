<script lang="ts">
import TrackerProgressSummary from '$lib/components/tracker/TrackerProgressSummary.svelte';
import { getTrackerColors } from '$lib/trackers/registry';
import { formatScreenTime } from '../screen-time';

let { totalMinutes, limit }: { totalMinutes: number; limit: number } = $props();
const colors = getTrackerColors('screen-time');
</script>

<TrackerProgressSummary
	value={totalMinutes}
	max={limit}
	displayValue={formatScreenTime(totalMinutes)}
	secondaryText={`/ ${formatScreenTime(limit)}`}
	label={`${totalMinutes} screen-time minutes`}
	{colors}
/>
