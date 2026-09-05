<script lang="ts">
import { ChevronRight, Salad } from '@lucide/svelte';
import type { NutritionEntry } from '$lib/api-types';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { Pressable } from '$lib/components/ui/pressable';
import { Card } from '$lib/components/ui/card';
import { Empty, EmptyTitle } from '$lib/components/ui/empty';

let { entries }: { entries: NutritionEntry[] } = $props();

function displayTime(value: Date | string) {
	const [time, period] = new Date(value)
		.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
		.split(' ');
	return { time, period };
}
</script>

<TrackerSection ariaLabel="Food log">
	<Card class={entries.length ? 'gap-0' : 'gap-0 p-0'}>
	{#if entries.length > 0}
		{#each entries as entry (entry.id)}
			{@const entryTime = displayTime(entry.createdAt)}
			{@const thumbnail = entry.thumbnail || entry.meals.find((meal) => meal.imageDataUrl)?.imageDataUrl}
			<Pressable
				href="/nutrition/entry/{entry.id}"
				class="grid h-auto w-full grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_auto_1rem] items-center gap-2 bg-transparent px-0 py-3 text-left whitespace-normal hover:bg-transparent hover:text-(--text) sm:grid-cols-[3rem_4rem_minmax(0,1fr)_auto_1.25rem] sm:gap-4 sm:py-4"
			>
				<span class="text-center text-xs leading-tight text-(--text-muted) tabular-nums">
					<span class="block">{entryTime.time}</span>
					<span class="mt-0.5 block text-[0.65rem]">{entryTime.period}</span>
				</span>
				{#if thumbnail}
					<img src={thumbnail} alt="" class="size-14 rounded-2xl object-cover sm:size-16" />
				{:else}
					<span class="flex size-14 items-center justify-center sm:size-16">
						<Salad class="size-5 text-(--text-muted)" />
					</span>
				{/if}
				<strong class="line-clamp-2 min-w-0 leading-5 font-medium">{entry.name}</strong>
				<span class="min-w-14 text-right">
					<strong class="block text-sm leading-4 tabular-nums">{entry.totals.calories}</strong>
					<span class="text-[0.65rem] leading-4 text-(--text-muted)">kcal</span>
				</span>
				<ChevronRight class="size-4 text-(--text-muted)" />
			</Pressable>
		{/each}
	{:else}
		<Empty class="py-10">
			<EmptyTitle>No meals yet</EmptyTitle>
		</Empty>
	{/if}
	</Card>
</TrackerSection>
