<script lang="ts">
import TrackerProgressSection from '$lib/components/tracker/TrackerProgressSection.svelte';
import { getTrackerColors } from '$lib/trackers/registry';

type Props = {
	steps: number;
	goal: number;
};

let { steps, goal }: Props = $props();
const colors = getTrackerColors('steps');
</script>

<TrackerProgressSection
	value={steps}
	max={goal}
	displayValue={steps.toLocaleString()}
	formatValue={(value) => Math.round(value).toLocaleString()}
	secondaryText={`/ ${goal.toLocaleString()}`}
	label={`${steps} of ${goal} steps`}
	{colors}
/>
