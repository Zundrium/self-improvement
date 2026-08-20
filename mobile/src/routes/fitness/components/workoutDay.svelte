<script lang="ts">
	import { Check, Clock3, Gauge, Layers3, Play } from '@lucide/svelte';
	import type { AudioManager } from '$lib/audio/audio-manager';

	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { getTrackerColors } from '$lib/trackers/registry';
	import type { Workout } from '../fitness';
	import WorkoutSession from './workoutSession.svelte';

	interface Props {
		workout: Workout;
		audioManager?: AudioManager;
		completed: boolean;
		saving?: boolean;
		ontoggle: () => void | Promise<void>;
		onspeedchange: (exerciseId: number, speedPercent: number) => void;
	}

	let {
		workout,
		audioManager,
		completed,
		saving = false,
		ontoggle,
		onspeedchange
	}: Props = $props();
	const colors = getTrackerColors('fitness');
	let isSessionActive = $state(false);
	const focus = $derived(workout.title.replace(/^Total Body - Day \d+:\s*/, ''));
	const hasRepExercises = $derived(workout.activities.some((activity) => activity.type === 'reps'));

	function startSession() {
		if (audioManager) isSessionActive = true;
	}

	async function handleSessionComplete() {
		if (!completed) await ontoggle();
		isSessionActive = false;
	}
</script>

{#snippet actions()}
	<Button
		size="lg"
		class="w-full bg-black px-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
		disabled={saving}
		aria-pressed={completed}
		onclick={ontoggle}
	>
		<Check class="mr-1 size-4" />
		{completed ? 'Completed' : 'Mark complete'}
	</Button>
	<Button
		size="lg"
		class="w-full px-2 text-white"
		style={`background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`}
		disabled={!audioManager}
		onclick={startSession}
	>
		<Play class="mr-1 size-4 fill-current" /> Start workout
	</Button>
{/snippet}

{#if isSessionActive && audioManager}
	<WorkoutSession
		{workout}
		{audioManager}
		oncomplete={handleSessionComplete}
		oncancel={() => (isSessionActive = false)}
		{onspeedchange}
	/>
{:else}
	<section class="mx-auto max-w-3xl" aria-labelledby="workout-title">
		<Card class="gap-4">
			<Badge>Day {workout.day}</Badge>
			<div>
				<h2
					id="workout-title"
					class="text-3xl font-medium tracking-[-0.04em] sm:text-4xl"
					style={`color: ${colors.primary}`}
				>
					{focus}
				</h2>
				<p class="mt-2 max-w-2xl text-sm leading-6 text-(--text)/56">{workout.description}</p>
			</div>
			<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-(--text)/56">
				<span class="flex items-center gap-2">
					<Layers3 class="size-4" />
					{workout.sets}
					{workout.sets === 1 ? 'set' : 'sets'}
				</span>
				<span class="flex items-center gap-2">
					<Clock3 class="size-4" />
					{workout.restBetweenExercises}s rests
				</span>
				{#if hasRepExercises}
					<span class="flex items-center gap-2">
						<Gauge class="size-4" /> Rep cadence applied
					</span>
				{/if}
			</div>
		</Card>

		<TrackerSection title="Exercises" {colors} class="mt-8">
			<div class="space-y-1">
				{#each workout.activities as activity, index (activity.id)}
					<div class="flex items-center gap-3 py-2">
						<span class="w-5 text-center text-xs text-(--text)/40">{index + 1}</span>
						<div class="size-14 shrink-0 overflow-hidden rounded-2xl bg-white">
							<img src={activity.imageUrl} alt="" class="size-full object-contain" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{activity.name}</p>
							<p class="mt-0.5 text-xs text-(--text)/40">
								{activity.amount}
								{activity.type === 'reps' ? 'reps' : 'seconds'}
							</p>
						</div>
						{#if activity.type === 'reps'}
							<Badge class={activity.speedPercent !== 100 ? 'bg-(--text) text-(--bg)' : ''}>
								{activity.speedPercent}%
							</Badge>
						{/if}
					</div>
				{/each}
			</div>
		</TrackerSection>

		<div class="mt-5 hidden grid-cols-2 gap-3 sm:grid">
			{@render actions()}
		</div>
	</section>

	<BottomActionBar>
		<div class="grid grid-cols-2 gap-3">
			{@render actions()}
		</div>
	</BottomActionBar>
{/if}
