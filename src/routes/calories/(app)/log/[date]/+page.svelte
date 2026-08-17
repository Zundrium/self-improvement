<script lang="ts">
	import { Camera, ChevronRight, Droplet, Drumstick, Salad, Wheat } from '@lucide/svelte';
	import type { PageProps } from './$types';

	import DateSelector from '$lib/components/date-selector.svelte';
	import MobileActionBar from '$lib/components/mobile-action-bar.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '$lib/components/ui/empty';

	let { data }: PageProps = $props();

	const consumed = $derived(Math.round(data.totals.calories));
	const goal = $derived(data.calorieGoal);
	const progress = $derived(Math.min(100, Math.round((consumed / Math.max(goal, 1)) * 100)));
	const mealCount = $derived(data.entries.reduce((total, entry) => total + entry.meals.length, 0));

	function calorieLogHref(date: string) {
		return `/calories/log/${date}`;
	}

	function displayDate(value: string) {
		return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	}

	function displayTime(value: Date | string) {
		const [time, period] = new Date(value)
			.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
			.split(' ');
		return { time, period };
	}
</script>

<svelte:head><title>{displayDate(data.date)} · Self Improvement</title></svelte:head>

<main class="mx-auto max-w-5xl space-y-6 px-4 py-8 pb-28 sm:px-6 sm:py-10">
	<DateSelector date={data.date} today={data.today} hrefForDate={calorieLogHref} />

	<section class="grid items-center gap-6 py-2 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
		<div class="flex flex-col items-center py-4 sm:py-6">
			<p class="mb-3 text-sm text-(--text)/48">Daily energy</p>
			<div
				class="relative flex size-56 items-center justify-center sm:size-64"
				role="progressbar"
				aria-label={`${consumed} of ${goal} calories consumed`}
				aria-valuemin="0"
				aria-valuemax={goal}
				aria-valuenow={consumed}
			>
				<svg class="absolute inset-0 size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
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
						stroke="currentColor"
						stroke-width="8"
						stroke-linecap="round"
						class="text-(--text) transition-all duration-500"
						style={`stroke-dasharray: ${progress} 100`}
					/>
				</svg>
				<div class="relative text-center">
					<strong class="block text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl"
						>{consumed}</strong
					>
					<span class="mt-2 block text-sm text-(--text)/48 tabular-nums">/ {goal} kcal</span>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-3 items-center">
			<div class="flex flex-col items-center gap-2 py-4 text-center">
				<Drumstick class="size-5 text-chart-2" /><strong class="text-2xl font-medium tabular-nums"
					>{data.totals.proteinG}g</strong
				><span class="text-xs text-(--text)/48">protein</span>
			</div>
			<div class="flex flex-col items-center gap-2 py-4 text-center">
				<Wheat class="size-5 text-chart-1" /><strong class="text-2xl font-medium tabular-nums"
					>{data.totals.carbsG}g</strong
				><span class="text-xs text-(--text)/48">carbs</span>
			</div>
			<div class="flex flex-col items-center gap-2 py-4 text-center">
				<Droplet class="size-5 text-chart-3" /><strong class="text-2xl font-medium tabular-nums"
					>{data.totals.fatG}g</strong
				><span class="text-xs text-(--text)/48">fat</span>
			</div>
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
			<Button href="/calories/track?date={data.date}" size="sm"
				><Camera class="mr-1.5 size-4" /> Add meal</Button
			>
		</div>

		{#if data.entries.length > 0}
			<div>
				{#each data.entries as entry (entry.id)}
					{@const entryTime = displayTime(entry.createdAt)}
					<Button
						href="/calories/entry/{entry.id}"
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
				<Button href="/calories/track?date={data.date}"
					><Camera class="mr-1.5 size-4" /> Add your first meal</Button
				>
			</Empty>
		{/if}
	</section>
</main>

<MobileActionBar>
	<Button href="/calories/track?date={data.date}" size="lg" class="w-full">
		<Camera class="mr-2 size-5" /> Add a meal
	</Button>
</MobileActionBar>
