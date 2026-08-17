<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';

	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const calorieGoal = $derived(data.dashboard.calorieGoal);
	const calorieProgress = $derived(
		calorieGoal ? Math.min(100, (data.dashboard.calories / calorieGoal) * 100) : 0
	);
</script>

<svelte:head>
	<title>Self Improvement</title>
	<meta
		name="description"
		content="A unified daily view for steps, nutrition, fitness, and meditation."
	/>
</svelte:head>

<main class="flex min-h-[calc(100svh-4rem)] items-center justify-center p-4 sm:p-6">
	<section class="w-full max-w-md space-y-3" aria-label="Today's dashboard">
		<Button
			href="/steps"
			variant="ghost"
			class="h-auto w-full justify-between rounded-3xl bg-(--bg-elevated) p-5 text-left whitespace-normal hover:bg-(--bg-elevated) hover:shadow-sm"
		>
			<span>
				<span class="block text-sm font-medium text-(--text)/52">Steps</span>
				<strong class="mt-1 block text-3xl font-medium tracking-[-0.05em] tabular-nums">
					{data.dashboard.steps.toLocaleString()}
				</strong>
				<span class="mt-1 block text-sm text-(--text)/48">steps today</span>
			</span>
			<ChevronRight class="size-5 text-(--text)/32" />
		</Button>

		<Button
			href="/fitness"
			variant="ghost"
			class="h-auto w-full justify-between rounded-3xl bg-(--bg-elevated) p-5 text-left whitespace-normal hover:bg-(--bg-elevated) hover:shadow-sm"
		>
			<span>
				<span class="block text-sm font-medium text-(--text)/52">Fitness</span>
				<strong class="mt-1 block text-xl font-medium tracking-[-0.03em]">
					{data.dashboard.fitnessDone ? 'Done today' : 'Not done yet'}
				</strong>
				<span class="mt-1 block text-sm text-(--text)/48">
					{data.dashboard.fitnessDone ? 'Workout complete' : 'Start today’s workout'}
				</span>
			</span>
			<ChevronRight class="size-5 text-(--text)/32" />
		</Button>

		<Button
			href="/calories/log/{data.dashboard.today}"
			variant="ghost"
			class="h-auto w-full justify-between rounded-3xl bg-(--bg-elevated) p-5 text-left whitespace-normal hover:bg-(--bg-elevated) hover:shadow-sm"
		>
			<span class="min-w-0 flex-1 pr-5">
				<span class="block text-sm font-medium text-(--text)/52">Nutrition</span>
				<strong class="mt-1 block text-xl font-medium tracking-[-0.03em] tabular-nums">
					{data.dashboard.calories.toLocaleString()}{#if calorieGoal}
						<span class="text-(--text)/40"> / {calorieGoal.toLocaleString()}</span>
					{/if}
					<span class="text-sm font-normal text-(--text)/48"> kcal</span>
				</strong>
				{#if calorieGoal}
					<Progress value={calorieProgress} class="mt-3 h-1.5" />
				{:else}
					<span class="mt-1 block text-sm text-(--text)/48">Set your daily calorie goal</span>
				{/if}
			</span>
			<ChevronRight class="size-5 text-(--text)/32" />
		</Button>

		<Button
			href="/meditate"
			variant="ghost"
			class="h-auto w-full justify-between rounded-3xl bg-(--bg-elevated) p-5 text-left whitespace-normal hover:bg-(--bg-elevated) hover:shadow-sm"
		>
			<span>
				<span class="block text-sm font-medium text-(--text)/52">Meditation</span>
				<strong class="mt-1 block text-xl font-medium tracking-[-0.03em]">
					{data.dashboard.meditationDone ? 'Done today' : 'Not done yet'}
				</strong>
				<span class="mt-1 block text-sm text-(--text)/48">
					{data.dashboard.meditationDone ? 'Session complete' : 'Start a meditation'}
				</span>
			</span>
			<ChevronRight class="size-5 text-(--text)/32" />
		</Button>
	</section>
</main>
