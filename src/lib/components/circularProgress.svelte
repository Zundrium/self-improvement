<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import type { TrackerColors } from '$lib/trackers/registry';
	import { progressRing } from '$lib/motion/gsap';

	type Props = {
		value: number;
		max: number;
		label: string;
		children: Snippet;
		colors?: TrackerColors;
		class?: string;
	};

	let { value, max, label, children, colors, class: className }: Props = $props();
	const gradientId = $props.id();
	const safeMax = $derived(Math.max(1, max));
	const boundedValue = $derived(Math.min(safeMax, Math.max(0, value)));
	const percentage = $derived(Math.min(100, Math.max(0, (value / safeMax) * 100)));
</script>

<div
	class={cn('relative flex size-56 items-center justify-center sm:size-64', className)}
	role="progressbar"
	aria-label={label}
	aria-valuemin="0"
	aria-valuemax={safeMax}
	aria-valuenow={boundedValue}
>
	<svg class="absolute inset-0 size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
		{#if colors}
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stop-color={colors.primary} />
					<stop offset="100%" stop-color={colors.secondary} />
				</linearGradient>
			</defs>
		{/if}
		<circle
			cx="60"
			cy="60"
			r="52"
			pathLength="100"
			fill="none"
			stroke="currentColor"
			stroke-width="8"
			class="text-(--text)/8"
		/>
		<circle
			cx="60"
			cy="60"
			r="52"
			pathLength="100"
			fill="none"
			stroke={colors ? `url(#${gradientId})` : 'currentColor'}
			stroke-width="8"
			stroke-linecap="round"
			use:progressRing={percentage}
		/>
	</svg>
	<div class="relative text-center">
		{@render children()}
	</div>
</div>
