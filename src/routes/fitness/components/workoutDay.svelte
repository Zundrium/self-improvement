<script lang="ts">
	import { Clock3, Gauge, Minus, Play, Plus } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import type { AudioManager } from '$lib/audio/audio-manager';

	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import {
		BottomActionBar,
		BottomActionButton,
		BottomActionGroup
	} from '$lib/components/ui/bottom-action-bar';
	import { getTrackerColors } from '$lib/trackers/registry';
	import type { Workout } from '../fitness';
	import WorkoutSession from './workoutSession.svelte';

	interface Props {
		date: string;
		workout: Workout;
		audioManager?: AudioManager;
		completed: boolean;
		ontoggle: () => void | Promise<void>;
		onspeedchange: (exerciseId: number, speedPercent: number) => void;
	}

	let {
		date,
		workout,
		audioManager,
		completed,
		ontoggle,
		onspeedchange
	}: Props = $props();
	const colors = getTrackerColors('fitness');
	let isSessionActive = $state(false);
	let loadedDate = $state(untrack(() => date));
	let loadedWorkoutId = $state(untrack(() => workout.id));
	let configuredSets = $state(untrack(() => workout.sets));
	const focus = $derived(workout.title.replace(/^Total Body - Day \d+:\s*/, ''));
	const hasRepExercises = $derived(workout.activities.some((activity) => activity.type === 'reps'));

	$effect(() => resetWorkout(date, workout));

	function resetWorkout(nextDate: string, nextWorkout: Workout) {
		if (loadedDate === nextDate && loadedWorkoutId === nextWorkout.id) return;
		loadedDate = nextDate;
		loadedWorkoutId = nextWorkout.id;
		isSessionActive = false;
		configuredSets = nextWorkout.sets;
	}

	function startSession() {
		if (audioManager) isSessionActive = true;
	}

	function adjustSets(delta: number) {
		configuredSets = Math.max(1, Math.min(10, configuredSets + delta));
	}

	async function handleSessionComplete() {
		if (!completed) await ontoggle();
		isSessionActive = false;
	}
</script>

{#snippet actions()}
	<BottomActionGroup justify="between" aria-label="Workout sets">
		<BottomActionButton
			format="icon"
			onclick={() => adjustSets(-1)}
			aria-label="Decrease sets"
		>
			<Minus class="size-4" />
		</BottomActionButton>
		<strong class="text-base font-medium tabular-nums">
			{configuredSets} {configuredSets === 1 ? 'set' : 'sets'}
		</strong>
		<BottomActionButton
			format="icon"
			onclick={() => adjustSets(1)}
			aria-label="Increase sets"
		>
			<Plus class="size-4" />
		</BottomActionButton>
	</BottomActionGroup>
	<BottomActionButton tone="primary" disabled={!audioManager} onclick={startSession}>
		<Play class="mr-1 size-4 fill-current" /> Start workout
	</BottomActionButton>
{/snippet}

{#if isSessionActive && audioManager}
	<WorkoutSession
		{workout}
		{audioManager}
		setCount={configuredSets}
		oncomplete={handleSessionComplete}
		oncancel={() => (isSessionActive = false)}
		{onspeedchange}
	/>
{:else}
	<section class="mx-auto max-w-3xl" aria-labelledby="workout-title">
		<div class="space-y-4">
			<div>
				<h2
					id="workout-title"
					class="text-3xl font-medium tracking-[-0.04em] sm:text-4xl"
					style={`color: ${colors.primary}`}
				>
					<Badge class="mr-2 align-middle text-white" style={`background: ${colors.primary}`}>
						Day {workout.day}
					</Badge>
					<span class="align-middle">{focus}</span>
				</h2>
				<p class="mt-2 max-w-2xl text-sm leading-6 text-(--text)/56">{workout.description}</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Badge>
					<Clock3 class="size-3.5" />
					{workout.restBetweenExercises === 0
						? 'No rests'
						: `${workout.restBetweenExercises}s rests`}
				</Badge>
				{#if hasRepExercises}
					<Badge><Gauge class="size-3.5" /> Guided reps</Badge>
				{/if}
			</div>
		</div>

		<TrackerSection title="Exercises" {colors} class="mt-8">
			<div class="space-y-1">
				{#each workout.activities as activity, index (activity.id)}
					<div class="flex items-center gap-3 py-2">
						<span class="w-5 text-center text-xs text-(--text)/40">{index + 1}</span>
						<div class="size-14 shrink-0 overflow-hidden rounded-2xl bg-(--text)/3">
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
