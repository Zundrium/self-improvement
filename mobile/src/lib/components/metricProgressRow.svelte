<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import type { TrackerColors } from '$lib/trackers/registry';

	type Props = {
		label: string;
		value: number;
		max: number;
		displayValue: string;
		colors?: TrackerColors;
	};

	let { label, value, max, displayValue, colors }: Props = $props();
</script>

<div class="grid grid-cols-[3.5rem_minmax(0,1fr)_5rem] items-center gap-3">
	<span class="text-sm font-medium">{label}</span>
	<Progress
		{value}
		{max}
		indicatorStyle={colors ? `background: ${colors.primary}` : undefined}
		aria-label={`${label}: ${displayValue}`}
	/>
	<span class="text-right text-sm text-(--text)/64 tabular-nums">{displayValue}</span>
</div>
