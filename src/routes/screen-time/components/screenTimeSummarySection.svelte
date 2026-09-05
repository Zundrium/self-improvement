<script lang="ts">
import TrackerProgressSection from '$lib/components/tracker/TrackerProgressSection.svelte';
import { getTrackerColors } from '$lib/trackers/registry';
import { formatScreenTime } from '../screen-time';

let { totalMinutes, limit }: { totalMinutes: number; limit: number } = $props();
const colors = getTrackerColors('screen-time');
</script>

<TrackerProgressSection
	value={totalMinutes}
	max={limit}
	displayValue={formatScreenTime(totalMinutes)}
	formatValue={formatScreenTime}
	secondaryText={`/ ${formatScreenTime(limit)}`}
	label={`${totalMinutes} screen-time minutes`}
	{colors}
/>
