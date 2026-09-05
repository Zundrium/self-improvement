<script lang="ts">
import type { TrackerColors } from '$lib/trackers/registry';
import CircularProgress from '$lib/components/metrics/CircularProgress.svelte';
import AnimatedValue from '$lib/components/metrics/AnimatedValue.svelte';

type Props = {
	value: number;
	max: number;
	displayValue: string;
	formatValue?: (value: number) => string;
	secondaryText: string;
	label: string;
	colors: TrackerColors;
};

let { value, max, displayValue, formatValue, secondaryText, label, colors }: Props = $props();
</script>

<section class="flex items-center justify-center py-2" aria-label={label} data-motion-item>
	<CircularProgress {value} {max} {label} {colors}>
		<strong class="block text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl">
			<AnimatedValue value={formatValue ? value : displayValue} format={formatValue} />
		</strong>
		<span class="mt-2 block text-sm text-(--text-muted) tabular-nums"><AnimatedValue value={secondaryText} /></span>
	</CircularProgress>
</section>
