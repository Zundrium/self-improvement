<script lang="ts">
import type { TrackerColors } from '$lib/trackers/registry';
import MetricProgressRow from '$lib/components/metrics/MetricProgressRow.svelte';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { staggerChildren } from '$lib/motion/gsap';

type HistoryItem = {
	key: string;
	label: string;
	value: number;
	max: number;
	displayValue: string;
};

type Props = {
	items: HistoryItem[];
	title?: string;
	description?: string;
	colors: TrackerColors;
};

let { items, colors, title = 'Last 7 days', description }: Props = $props();
</script>

<TrackerSection {title} {description} {colors}>
	<div class="space-y-4" use:staggerChildren>
		{#each items as item (item.key)}
			<MetricProgressRow
				label={item.label}
				value={item.value}
				max={item.max}
				displayValue={item.displayValue}
				{colors}
			/>
		{/each}
	</div>
</TrackerSection>
