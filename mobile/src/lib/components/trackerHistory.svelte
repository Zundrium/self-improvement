<script lang="ts">
	import type { TrackerColors } from '$lib/trackers/registry';
	import MetricProgressRow from './metricProgressRow.svelte';
	import TrackerSection from './trackerSection.svelte';

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

<TrackerSection {title} {description} {colors} contentClass="space-y-4">
	{#each items as item (item.key)}
		<MetricProgressRow
			label={item.label}
			value={item.value}
			max={item.max}
			displayValue={item.displayValue}
			{colors}
		/>
	{/each}
</TrackerSection>
