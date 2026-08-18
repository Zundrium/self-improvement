<script lang="ts">
	import {
		Apple,
		Check,
		ChevronRight,
		Droplet,
		Dumbbell,
		Flower2,
		Footprints,
		Moon,
		Smile,
		Smartphone
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { TrackerId } from '$lib/trackers/registry';
	import { happinessLabel } from './(trackers)/happiness/happiness';
	import { formatScreenTime } from './(trackers)/screen-time/screen-time';
	import { formatSleepMinutes } from './(trackers)/sleep/sleep';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const stepsDone = $derived(data.dashboard.steps >= data.dashboard.stepGoal);
	const sleepDone = $derived(data.dashboard.sleepMinutes >= data.dashboard.sleepGoalMinutes);
	const caloriesDone = $derived(
		data.dashboard.calorieGoal !== null && data.dashboard.calories <= data.dashboard.calorieGoal
	);
	const happinessSummary = $derived(
		data.dashboard.happinessRating
			? `${data.dashboard.happinessRating}/5 · ${happinessLabel(data.dashboard.happinessRating)}`
			: 'No happiness logged'
	);
	const periodLabel = $derived(
		data.dashboard.periodFlow
			? `${data.dashboard.periodFlow[0].toUpperCase()}${data.dashboard.periodFlow.slice(1)} flow`
			: 'No period logged'
	);

	function datedFeatureHref(
		path:
			'/fitness' | '/happiness' | '/meditation' | '/period' | '/screen-time' | '/sleep' | '/steps'
	) {
		return data.dashboard.date === data.dashboard.today
			? path
			: `${path}?date=${data.dashboard.date}`;
	}

	function trackerEnabled(id: TrackerId) {
		return data.enabledTrackers.some((tracker) => tracker.id === id);
	}
</script>

<svelte:head>
	<title>Self Improvement</title>
	<meta
		name="description"
		content="A unified daily view for health, wellbeing, fitness, and screen-time tracking."
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

<main class="flex flex-1 items-start justify-center px-4 pt-6 pb-4 sm:px-6 sm:pb-6">
	<div class="w-full max-w-md">
		{#if data.enabledTrackers.length}
			<section class="divide-y divide-(--text)/8" aria-label="Daily dashboard">
				{#if trackerEnabled('steps')}
					<Button
						href={datedFeatureHref('/steps')}
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
				{/if}

				{#if trackerEnabled('sleep')}
					<Button
						href={datedFeatureHref('/sleep')}
						variant="ghost"
						class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
						aria-label={`${formatSleepMinutes(data.dashboard.sleepMinutes)} of ${formatSleepMinutes(data.dashboard.sleepGoalMinutes)} sleep, goal ${sleepDone ? 'complete' : 'not complete'}`}
					>
						<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
							<Moon class="size-6 text-(--text)/64" />
							<span class="flex min-w-0 items-center gap-3">
								{@render statusCheckbox(sleepDone)}
								<strong class="min-w-0 text-xl font-medium tracking-[-0.03em] tabular-nums">
									{formatSleepMinutes(data.dashboard.sleepMinutes)}
									<span class="font-normal text-(--text)/40">
										/ {formatSleepMinutes(data.dashboard.sleepGoalMinutes)} sleep
									</span>
								</strong>
							</span>
							<ChevronRight class="size-5 text-(--text)/28" />
						</span>
					</Button>
				{/if}

				{#if trackerEnabled('screen-time')}
					<Button
						href={datedFeatureHref('/screen-time')}
						variant="ghost"
						class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
						aria-label={`${formatScreenTime(data.dashboard.screenTimeMinutes)} screen time`}
					>
						<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
							<Smartphone class="size-6 text-(--text)/64" />
							<span class="flex min-w-0 items-center gap-3">
								{@render statusCheckbox(data.dashboard.screenTimeMinutes > 0)}
								<strong class="text-base font-medium tracking-[-0.02em]">
									{formatScreenTime(data.dashboard.screenTimeMinutes)} screen time
								</strong>
							</span>
							<ChevronRight class="size-5 text-(--text)/28" />
						</span>
					</Button>
				{/if}

				{#if trackerEnabled('fitness')}
					<Button
						href={datedFeatureHref('/fitness')}
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
				{/if}

				{#if trackerEnabled('nutrition')}
					<Button
						href="/nutrition/log/{data.dashboard.date}"
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
				{/if}

				{#if trackerEnabled('meditation')}
					<Button
						href={datedFeatureHref('/meditation')}
						variant="ghost"
						class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
						aria-label={`Meditation, ${data.dashboard.meditationDone ? 'complete' : 'not complete'}`}
					>
						<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
							<Flower2 class="size-6 text-(--text)/64" />
							<span class="flex min-w-0 items-center gap-3">
								{@render statusCheckbox(data.dashboard.meditationDone)}
								<strong class="text-base font-medium tracking-[-0.02em]">Meditation</strong>
							</span>
							<ChevronRight class="size-5 text-(--text)/28" />
						</span>
					</Button>
				{/if}

				{#if trackerEnabled('happiness')}
					<Button
						href={datedFeatureHref('/happiness')}
						variant="ghost"
						class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
						aria-label={`Happiness tracker: ${happinessSummary}`}
					>
						<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
							<Smile class="size-6 text-(--text)/64" />
							<span class="flex min-w-0 items-center gap-3">
								{@render statusCheckbox(data.dashboard.happinessRating !== null)}
								<strong class="text-base font-medium tracking-[-0.02em]">
									{happinessSummary}
								</strong>
							</span>
							<ChevronRight class="size-5 text-(--text)/28" />
						</span>
					</Button>
				{/if}

				{#if trackerEnabled('period')}
					<Button
						href={datedFeatureHref('/period')}
						variant="ghost"
						class="h-auto w-full rounded-none bg-transparent px-0 py-5 text-left whitespace-normal hover:bg-transparent"
						aria-label={`Period tracker: ${periodLabel}`}
					>
						<span class="grid w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-4">
							<Droplet class="size-6 text-(--text)/64" />
							<span class="flex min-w-0 items-center gap-3">
								{@render statusCheckbox(data.dashboard.periodFlow !== null)}
								<strong class="text-base font-medium tracking-[-0.02em]">{periodLabel}</strong>
							</span>
							<ChevronRight class="size-5 text-(--text)/28" />
						</span>
					</Button>
				{/if}
			</section>
		{:else}
			<section class="space-y-4 py-12 text-center">
				<h1 class="text-xl font-medium">No trackers selected</h1>
				<p class="text-sm text-(--text)/56">Choose the trackers you want to see in your profile.</p>
				<Button href="/profile">Choose trackers</Button>
			</section>
		{/if}
	</div>
</main>
