<script lang="ts">
import { Check } from '@lucide/svelte';
import { gsap } from 'gsap';
import { onMount, onDestroy, untrack } from 'svelte';
import type { TrackerProgressPresentation } from '$lib/trackers/progress';
import {
	chartPoints,
	chartTransition,
	interpolateChart,
	chartSegments,
	type ChartPoint
} from '$lib/motion/progress-chart';
import { prefersReducedMotion, watchReducedMotion } from '$lib/motion/preference';

let { mode, days, maxValue, ariaLabel }: TrackerProgressPresentation = $props();
let points = $state.raw<ChartPoint[]>(untrack(() => chartPoints(days, maxValue)));
let target = untrack(() => points);
let tween: gsap.core.Tween | undefined;
const segments = $derived(chartSegments(points));
const weekdayFormatter = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' });

function finish() {
	tween?.kill();
	points = target;
}

function move(next: ChartPoint[]) {
	if (JSON.stringify(target) === JSON.stringify(next)) return;
	tween?.kill();
	target = next;
	if (prefersReducedMotion()) return finish();
	const transition = chartTransition(points, next);
	const state = { progress: 0 };
	points = transition.from;
	tween = gsap.to(state, {
		progress: 1,
		duration: 0.6,
		ease: 'power3.out',
		onUpdate: () => {
			points = interpolateChart(transition, state.progress);
		},
		onComplete: finish
	});
}

$effect(() => {
	const next = chartPoints(days, maxValue);
	untrack(() => move(next));
});

onMount(() => watchReducedMotion(finish));
onDestroy(() => tween?.kill());

function weekday(date: string) {
	return weekdayFormatter.format(new Date(`${date}T00:00:00Z`));
}
</script>

<section
	class="mx-auto w-full max-w-(--app-compact-max-width)"
	aria-label={ariaLabel}
	data-motion-item
	data-progress-chart
>
	<div class="relative h-22 overflow-hidden" aria-hidden="true">
		{#if mode === 'line'}
			<svg
				class="absolute inset-x-0 top-0 block h-14 w-full"
				viewBox="0 0 100 56"
				preserveAspectRatio="none"
			>
				{#each segments as segment (segment.key)}
					<path
						d={segment.path}
						opacity={segment.opacity}
						fill="none"
						stroke="var(--tracker-color-middle)"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						vector-effect="non-scaling-stroke"
					/>
				{/each}
			</svg>
		{/if}
		{#each points as point (point.date)}
			<div
				class="absolute top-0 left-0 h-22 w-1/5"
				style:transform={`translateX(${(point.x - 10) * 5}%)`}
				style:opacity={point.opacity}
				data-chart-date={point.date}
			>
				{#if mode === 'line'}
					{#if point.value !== null}
						<span
							class="absolute top-0 left-1/2 size-2.5 rounded-full ring-[1.5px] ring-(--tracker-color-middle)"
							style:transform={`translate(-50%, ${point.y - 5}px) scale(${0.8 + point.selected * 0.2})`}
							style:background={`color-mix(in srgb, var(--tracker-color-middle) ${point.selected * 100}%, var(--bg))`}
						></span>
					{/if}
				{:else}
					<div class="flex h-14 items-center justify-center">
						<div
							class="flex size-8 items-center justify-center rounded-lg bg-(--text)/6"
							class:opacity-35={point.value === null}
							style:background={point.value === 1
								? 'color-mix(in srgb, var(--tracker-color-middle) 60%, transparent)'
								: undefined}
						>
							{#if point.value === 1}<Check class="size-4 text-(--app-on-color)" strokeWidth={2.5} />{/if}
						</div>
					</div>
				{/if}
				<div class="absolute inset-x-0 top-14 flex h-8 items-center justify-center">
					<span
						class="rounded-full px-2.5 py-1 text-[11px] leading-4 font-medium"
						style:color={`color-mix(in srgb, var(--tracker-color-middle) ${point.selected * 100}%, color-mix(in srgb, var(--text) 38%, transparent))`}
						style:background={`color-mix(in srgb, var(--tracker-color-middle) ${point.selected * 12}%, transparent)`}
					>{weekday(point.date)}</span>
				</div>
			</div>
		{/each}
	</div>
	<ol class="sr-only">
		{#each days as day}
			<li>
				{day.date}: {day.value === null ? 'No data' : mode === 'check' ? day.value === 1 ? 'Complete' : 'Not complete' : day.value}
			</li>
		{/each}
	</ol>
</section>
