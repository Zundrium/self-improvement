<script lang="ts">
	import { Apple, Check, ChevronRight, Dumbbell, Flower2, Footprints } from '@lucide/svelte';

	import DateSelector from '$lib/components/date-selector.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function dashboardHref(date: string) {
		return date === data.dashboard.today ? '/' : `/?date=${date}`;
	}
</script>

<svelte:head>
	<title>Self Improvement</title>
	<meta
		name="description"
		content="A unified daily view for steps, nutrition, fitness, and meditation."
	/>
</svelte:head>

<main class="flex min-h-[calc(100svh-4rem)] items-center justify-center p-4 sm:p-6">
	<div class="w-full max-w-md space-y-6">
		<DateSelector
			date={data.dashboard.date}
			today={data.dashboard.today}
			hrefForDate={dashboardHref}
		/>

		<section class="divide-y divide-(--text)/8" aria-label="Daily dashboard">
			<Button
				href="/steps"
				variant="ghost"
				class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
				aria-label={`${data.dashboard.steps.toLocaleString()} of ${data.dashboard.stepGoal.toLocaleString()} steps`}
			>
				<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
					<Footprints class="size-6 text-(--text)/64" />
					<strong class="min-w-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
						{data.dashboard.steps.toLocaleString()}
						<span class="font-normal text-(--text)/40">
							/ {data.dashboard.stepGoal.toLocaleString()} steps
						</span>
					</strong>
					<ChevronRight class="size-5 text-(--text)/28" />
				</span>
			</Button>

			<Button
				href="/fitness"
				variant="ghost"
				class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
				aria-label={`Fitness ${data.dashboard.fitnessDone ? 'complete' : 'not complete'}: ${data.dashboard.fitnessWorkoutTitle}`}
			>
				<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
					<Dumbbell class="size-6 text-(--text)/64" />
					<span class="flex min-w-0 items-center gap-3">
						<span
							class="flex size-5 shrink-0 items-center justify-center rounded-md border {data
								.dashboard.fitnessDone
								? 'border-(--text) bg-(--text) text-(--bg)'
								: 'border-(--text)/24'}"
						>
							{#if data.dashboard.fitnessDone}<Check class="size-3.5" />{/if}
						</span>
						<strong class="truncate text-base font-medium tracking-[-0.02em]">
							{data.dashboard.fitnessWorkoutTitle}
						</strong>
					</span>
					<ChevronRight class="size-5 text-(--text)/28" />
				</span>
			</Button>

			<Button
				href="/calories/log/{data.dashboard.date}"
				variant="ghost"
				class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
				aria-label={`${data.dashboard.calories.toLocaleString()}${data.dashboard.calorieGoal ? ` of ${data.dashboard.calorieGoal.toLocaleString()}` : ''} calories`}
			>
				<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
					<Apple class="size-6 text-(--text)/64" />
					<strong class="min-w-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
						{data.dashboard.calories.toLocaleString()}
						{#if data.dashboard.calorieGoal}
							<span class="font-normal text-(--text)/40">
								/ {data.dashboard.calorieGoal.toLocaleString()} calories
							</span>
						{:else}
							<span class="font-normal text-(--text)/40"> calories</span>
						{/if}
					</strong>
					<ChevronRight class="size-5 text-(--text)/28" />
				</span>
			</Button>

			<Button
				href="/meditate"
				variant="ghost"
				class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
				aria-label={`Meditation ${data.dashboard.meditationDone ? 'complete' : 'not complete'}`}
			>
				<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
					<Flower2 class="size-6 text-(--text)/64" />
					<span
						class="flex size-5 items-center justify-center rounded-md border {data.dashboard
							.meditationDone
							? 'border-(--text) bg-(--text) text-(--bg)'
							: 'border-(--text)/24'}"
					>
						{#if data.dashboard.meditationDone}<Check class="size-3.5" />{/if}
					</span>
					<ChevronRight class="size-5 text-(--text)/28" />
				</span>
			</Button>
		</section>
	</div>
</main>
