<script lang="ts">
import TrackerProgressSummary from '$lib/components/tracker/TrackerProgressSummary.svelte';
import { getTrackerColors } from '$lib/trackers/registry';

type Props = {
	steps: number;
	goal: number;
};

let { steps, goal }: Props = $props();
const colors = getTrackerColors('steps');
</script>

<TrackerProgressSummary
	value={steps}
	max={goal}
	displayValue={steps.toLocaleString()}
	secondaryText={`/ ${goal.toLocaleString()}`}
	label={`${steps} of ${goal} steps`}
	{colors}
/>
