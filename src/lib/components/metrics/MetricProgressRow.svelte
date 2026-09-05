<script lang="ts">
import { Progress } from '$lib/components/ui/progress/index';
import AnimatedValue from './AnimatedValue.svelte';
import { trackerGradient, type TrackerColors } from '$lib/trackers/registry';

type Props = {
	label: string;
	value: number;
	max: number;
	displayValue: string;
	formatValue?: (value: number) => string;
	colors?: TrackerColors;
};

let { label, value, max, displayValue, formatValue, colors }: Props = $props();
</script>

<div class="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3">
	<span class="text-sm font-medium">{label}</span>
	<Progress
		class="min-w-0 w-full"
		{value}
		{max}
		indicatorBackground={colors ? trackerGradient(colors) : undefined}
		aria-label={`${label}: ${displayValue}`}
	/>
	<span class="pl-1 text-right text-sm text-(--text)/64 tabular-nums"><AnimatedValue value={formatValue ? value : displayValue} format={formatValue} /></span>
</div>
