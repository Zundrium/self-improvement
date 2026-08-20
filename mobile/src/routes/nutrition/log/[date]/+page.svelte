<script lang="ts">
	import { Camera, ChevronRight, Droplet, Drumstick, Salad, Wheat } from '@lucide/svelte';
	import type { PageProps } from './$types';

	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import CircularProgress from '$lib/components/circularProgress.svelte';
	import MetricStat from '$lib/components/metricStat.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '$lib/components/ui/empty';
	import { fullDateLabel } from '$lib/dateFormatting';

	let { data }: PageProps = $props();

	const consumed = $derived(Math.round(data.totals.calories));
	const goal = $derived(data.calorieGoal);
	const mealCount = $derived(data.entries.reduce((total, entry) => total + entry.meals.length, 0));

	function displayTime(value: Date | string) {
		const [time, period] = new Date(value)
			.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
			.split(' ');
		return { time, period };
	}
</script>

<svelte:head><title>{fullDateLabel(data.date)} · Self Improvement</title></svelte:head>

<main class="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	<section class="grid items-center gap-6 py-2 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
		<div class="flex flex-col items-center py-4 sm:py-6">
			<p class="mb-3 text-sm text-(--text)/48">Daily energy</p>
			<CircularProgress
				value={consumed}
				max={goal}
				label={`${consumed} of ${goal} calories consumed`}
			>
				<strong class="block text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl">
					{consumed}
				</strong>
				<span class="mt-2 block text-sm text-(--text)/48 tabular-nums">/ {goal} kcal</span>
			</CircularProgress>
		</div>

		<div class="grid grid-cols-3 items-center">
			<MetricStat
				icon={Drumstick}
				value={`${data.totals.proteinG}g`}
				label="protein"
				iconClass="text-chart-2"
			/>
			<MetricStat
				icon={Wheat}
				value={`${data.totals.carbsG}g`}
				label="carbs"
				iconClass="text-chart-1"
			/>
			<MetricStat
				icon={Droplet}
				value={`${data.totals.fatG}g`}
				label="fat"
				iconClass="text-chart-3"
			/>
		</div>
	</section>

	<section class="space-y-3">
		<div class="flex items-end justify-between px-1">
			<div>
				<h1 class="text-xl font-medium tracking-[-0.04em]">Food log</h1>
				<p class="text-sm text-(--text)/48">
					{mealCount}
					{mealCount === 1 ? 'meal' : 'meals'} · {data.trackedDates.length} tracked {data
						.trackedDates.length === 1
						? 'day'
						: 'days'} this month
				</p>
			</div>
			<Button href="/nutrition/track?date={data.date}" size="sm"
				><Camera class="mr-1.5 size-4" /> Add meal</Button
			>
		</div>

		{#if data.entries.length > 0}
			<div>
				{#each data.entries as entry (entry.id)}
					{@const entryTime = displayTime(entry.createdAt)}
					<Button
						href="/nutrition/entry/{entry.id}"
						variant="ghost"
						class="grid h-auto w-full grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_auto_1rem] items-center gap-2 rounded-none border-b border-(--text)/8 bg-transparent px-0 py-3 text-left whitespace-normal hover:bg-transparent hover:text-(--text) sm:grid-cols-[3rem_4rem_minmax(0,1fr)_auto_1.25rem] sm:gap-4 sm:py-4"
					>
						<span class="text-center text-xs leading-tight text-(--text)/48 tabular-nums">
							<span class="block">{entryTime.time}</span>
							<span class="mt-0.5 block text-[0.65rem]">{entryTime.period}</span>
						</span>
						{#if entry.thumbnail}
							<img
								src={entry.thumbnail}
								alt=""
								class="size-14 rounded-2xl object-cover sm:size-16"
							/>
						{:else}
							<span
								class="flex size-14 items-center justify-center rounded-2xl bg-(--text)/5 sm:size-16"
								><Salad class="size-5 text-(--text)/40" /></span
							>
						{/if}
						<strong class="line-clamp-2 min-w-0 leading-5 font-medium">{entry.name}</strong>
						<Badge class="flex min-w-14 flex-col gap-0 px-2.5 py-1.5 text-center">
							<strong class="text-sm leading-4 text-(--text) tabular-nums"
								>{entry.totals.calories}</strong
							>
							<span class="text-[0.65rem] leading-4">kcal</span>
						</Badge>
						<ChevronRight class="size-4 text-(--text)/32" />
					</Button>
				{/each}
			</div>
		{:else}
			<Empty>
				<EmptyMedia><Salad class="size-6" /></EmptyMedia>
				<EmptyTitle>No meals yet</EmptyTitle>
				<EmptyDescription
					>Take one photo, review the estimate, and add the meal in a few taps.</EmptyDescription
				>
				<Button href="/nutrition/track?date={data.date}"
					><Camera class="mr-1.5 size-4" /> Add your first meal</Button
				>
			</Empty>
		{/if}
	</section>
</main>

<BottomActionBar>
	<Button href="/nutrition/track?date={data.date}" size="lg" class="w-full">
		<Camera class="mr-2 size-5" /> Add a meal
	</Button>
</BottomActionBar>
