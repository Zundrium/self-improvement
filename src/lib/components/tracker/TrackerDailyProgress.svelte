<script lang="ts">
import { Check } from '@lucide/svelte';
import type { TrackerProgressPresentation } from '$lib/trackers/progress';

let { mode, days, maxValue, ariaLabel }: TrackerProgressPresentation = $props();

const chartMaximum = $derived(Math.max(maxValue ?? 0, ...days.map(({ value }) => value ?? 0), 1));
const linePath = $derived(
	buildLinePath(
		days.map(({ value }) => value),
		chartMaximum
	)
);
function pointX(index: number) {
	return 10 + index * 20;
}

function pointY(value: number) {
	return 46 - (Math.max(0, value) / chartMaximum) * 36;
}

function buildLinePath(values: Array<number | null>, maximum: number) {
	let drawing = false;
	return values
		.map((value, index) => {
			if (value === null) {
				drawing = false;
				return '';
			}
			const command = drawing ? 'L' : 'M';
			drawing = true;
			return `${command} ${pointX(index)} ${46 - (Math.max(0, value) / maximum) * 36}`;
		})
		.filter(Boolean)
		.join(' ');
}

function weekday(date: string) {
	return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
		new Date(`${date}T00:00:00Z`)
	);
}
</script>

<section
	class="mx-auto w-full max-w-(--app-compact-max-width)"
	aria-label={ariaLabel}
	data-motion-item
>
	<div>
		{#if mode === 'line'}
			<div class="relative h-14" aria-hidden="true">
				<svg
					class="absolute inset-0 block size-full overflow-visible"
					viewBox="0 0 100 56"
					preserveAspectRatio="none"
				>
					<path
						d={linePath}
						fill="none"
						stroke="var(--tracker-color-middle)"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						vector-effect="non-scaling-stroke"
					/>
				</svg>
				{#each days as day, index (day.date)}
					{#if day.value !== null}
						<span
							class="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--bg) ring-[1.5px] ring-(--tracker-color-middle)"
							class:size-2.5={index === 2}
							class:bg-(--tracker-color-middle)={index === 2}
							style:left={`${pointX(index)}%`}
							style:top={`${pointY(day.value)}px`}
						></span>
					{/if}
				{/each}
			</div>
		{:else}
			<div class="grid h-14 grid-cols-5 items-center" aria-hidden="true">
				{#each days as day (day.date)}
					<div class="flex justify-center">
						<div
							class="flex size-8 items-center justify-center rounded-lg bg-(--text)/6"
							class:opacity-35={day.value === null}
							style={day.value === 1
								? 'background: color-mix(in srgb, var(--tracker-color-middle) 60%, transparent)'
								: undefined}
						>
							{#if day.value === 1}<Check class="size-4 text-(--app-on-color)" strokeWidth={2.5} />{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="grid h-8 grid-cols-5" aria-hidden="true">
			{#each days as day, index (day.date)}
				<div class="flex items-center justify-center">
					<span
						class={`rounded-full px-2.5 py-1 text-[11px] leading-4 font-medium ${index === 2 ? 'text-(--tracker-color-middle)' : 'text-(--text)/38'}`}
						style={index === 2
							? 'background: color-mix(in srgb, var(--tracker-color-middle) 12%, transparent)'
							: undefined}
					>
						{weekday(day.date)}
					</span>
				</div>
			{/each}
		</div>
	</div>
</section>
