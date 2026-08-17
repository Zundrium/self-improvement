<script lang="ts">
	import { Apple, Check, ChevronRight, Dumbbell, Flower2, Footprints } from '@lucide/svelte';

	import DateSelector from '$lib/components/date-selector.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const stepsDone = $derived(data.dashboard.steps >= data.dashboard.stepGoal);
	const caloriesDone = $derived(
		data.dashboard.calorieGoal !== null && data.dashboard.calories <= data.dashboard.calorieGoal
	);

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

{#snippet statusCheckbox(checked: boolean)}
	<span
		aria-hidden="true"
		class="flex size-5 shrink-0 items-center justify-center rounded-md border {checked
			? 'border-(--text) bg-(--text) text-(--bg)'
			: 'border-(--text)/24'}"
	>
		{#if checked}<Check class="size-3.5" />{/if}
	</span>
{/snippet}

<main class="flex min-h-[calc(100svh-4rem)] items-start justify-center p-4 sm:p-6">
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
				aria-label={`${data.dashboard.steps.toLocaleString()} of ${data.dashboard.stepGoal.toLocaleString()} steps, goal ${stepsDone ? 'complete' : 'not complete'}`}
			>
				<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
					<Footprints class="size-6 text-(--text)/64" />
					<span class="flex min-w-0 items-center gap-3">
						{@render statusCheckbox(stepsDone)}
						<strong class="min-w-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
							{data.dashboard.steps.toLocaleString()}
							<span class="font-normal text-(--text)/40">
								/ {data.dashboard.stepGoal.toLocaleString()} steps
							</span>
						</strong>
					</span>
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
						{@render statusCheckbox(data.dashboard.fitnessDone)}
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
				aria-label={`${data.dashboard.calories.toLocaleString()}${data.dashboard.calorieGoal ? ` of ${data.dashboard.calorieGoal.toLocaleString()}` : ''} calories${data.dashboard.calorieGoal ? `, goal ${caloriesDone ? 'complete' : 'not complete'}` : ''}`}
			>
				<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
					<Apple class="size-6 text-(--text)/64" />
					<span class="flex min-w-0 items-center gap-3">
						{@render statusCheckbox(caloriesDone)}
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
					</span>
					<ChevronRight class="size-5 text-(--text)/28" />
				</span>
			</Button>

			<Button
				href="/meditate"
				variant="ghost"
				class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
				aria-label={`Meditate today, ${data.dashboard.meditationDone ? 'complete' : 'not complete'}`}
			>
				<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
					<Flower2 class="size-6 text-(--text)/64" />
					<span class="flex min-w-0 items-center gap-3">
						{@render statusCheckbox(data.dashboard.meditationDone)}
						<strong class="text-base font-medium tracking-[-0.02em]">Meditate today</strong>
					</span>
					<ChevronRight class="size-5 text-(--text)/28" />
				</span>
			</Button>
		</section>
	</div>
</main>
