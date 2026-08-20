<script lang="ts">
	import TrackerProgressSummary from '$lib/components/trackerProgressSummary.svelte';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { formatSleepMinutes } from '../sleep';

	type Props = {
		minutes: number;
		goal: number;
	};

	let { minutes, goal }: Props = $props();
	const colors = getTrackerColors('sleep');
</script>

<TrackerProgressSummary
	value={minutes}
	max={goal}
	displayValue={formatSleepMinutes(minutes)}
	secondaryText={`/ ${formatSleepMinutes(goal)}`}
	label={`${minutes} of ${goal} sleep minutes`}
	{colors}
/>
