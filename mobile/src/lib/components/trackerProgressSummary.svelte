<script lang="ts">
	import type { TrackerColors } from '$lib/trackers/registry';
	import CircularProgress from './circularProgress.svelte';

	type Props = {
		value: number;
		max: number;
		displayValue: string;
		secondaryText: string;
		label: string;
		colors: TrackerColors;
	};

	let { value, max, displayValue, secondaryText, label, colors }: Props = $props();
</script>

<section class="flex items-center justify-center py-2" aria-label={label} data-motion-item>
	<CircularProgress {value} {max} {label} {colors}>
		<strong class="block text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl">
			{displayValue}
		</strong>
		<span class="mt-2 block text-sm text-(--text)/48 tabular-nums">{secondaryText}</span>
	</CircularProgress>
</section>
