<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { AudioManager } from '$lib/audio/audio-manager';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import FitnessClock from './components/FitnessClock.svelte';
	import WorkoutCalendar from './components/WorkoutCalendar.svelte';
	import WorkoutModal from './components/WorkoutModal.svelte';
	import type { Workout } from './fitness';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const completedDateKeys = new SvelteSet<string>(
		untrack(() => data.completedDays.map((day) => day.dateKey))
	);
	const savingDateKeys = new SvelteSet<string>();
	let selectedWorkout = $state<Workout | null>(null);
	let selectedDateKey = $state<string | null>(null);
	let exerciseSpeeds = $state(
		untrack(
			() =>
				Object.fromEntries(
					data.program.workouts.flatMap((workout) =>
						workout.activities.flatMap((activity) =>
							activity.type === 'reps'
								? [[activity.exerciseId, activity.speedPercent] as const]
								: []
						)
					)
				) as Record<number, number>
		)
	);
	let errorMessage = $state('');
	let audioManager = $state<AudioManager>();

	const selectedWorkoutWithSpeeds = $derived<Workout | null>(
		selectedWorkout
			? {
					...selectedWorkout,
					activities: selectedWorkout.activities.map((activity) =>
						activity.type === 'reps'
							? {
									...activity,
									speedPercent: exerciseSpeeds[activity.exerciseId] ?? activity.speedPercent
								}
							: activity
					)
				}
			: null
	);
	onMount(() => {
		audioManager = new AudioManager();
		audioManager.setVolume(1);
		return () => audioManager?.destroy();
	});

	function handleDayClick({ day, dateKey }: { day: number; dateKey: string }) {
		selectedWorkout = data.program.workouts.find((workout) => workout.day === day) ?? null;
		selectedDateKey = selectedWorkout ? dateKey : null;
	}

	function closeWorkout() {
		selectedWorkout = null;
		selectedDateKey = null;
	}

	function handleSpeedChange(exerciseId: number, speedPercent: number) {
		exerciseSpeeds = { ...exerciseSpeeds, [exerciseId]: speedPercent };
	}

	async function toggleComplete(workoutId: number, dateKey: string) {
		if (savingDateKeys.has(dateKey)) return;
		errorMessage = '';
		const wasCompleted = completedDateKeys.has(dateKey);
		if (wasCompleted) completedDateKeys.delete(dateKey);
		else completedDateKeys.add(dateKey);
		savingDateKeys.add(dateKey);

		const progressUrl = `/fitness/api/progress/${workoutId}`;
		const response = await fetch(
			wasCompleted ? `${progressUrl}?date=${encodeURIComponent(dateKey)}` : progressUrl,
			{
				method: wasCompleted ? 'DELETE' : 'PUT',
				headers: wasCompleted ? undefined : { 'content-type': 'application/json' },
				body: wasCompleted ? undefined : JSON.stringify({ completedDate: dateKey })
			}
		);
		savingDateKeys.delete(dateKey);

		if (!response.ok) {
			if (wasCompleted) completedDateKeys.add(dateKey);
			else completedDateKeys.delete(dateKey);
			errorMessage = 'Your progress could not be saved. Please try again.';
		}
	}
</script>

<svelte:head>
	<title>{data.program.name} · Self Improvement</title>
	<meta name="description" content={data.program.description} />
</svelte:head>

<main
	class="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col items-center justify-center px-4 py-10 sm:px-6"
>
	<div class="w-full">
		<FitnessClock />

		<div class="mt-10 w-full">
			<WorkoutCalendar completedDateKeys={[...completedDateKeys]} ondayclick={handleDayClick} />
		</div>

		{#if errorMessage}
			<Alert variant="destructive" class="mx-auto mt-4 max-w-sm">
				<AlertDescription>{errorMessage}</AlertDescription>
			</Alert>
		{/if}
	</div>
</main>

{#if selectedWorkoutWithSpeeds && selectedDateKey && audioManager}
	<WorkoutModal
		{audioManager}
		workout={selectedWorkoutWithSpeeds}
		completed={completedDateKeys.has(selectedDateKey)}
		saving={savingDateKeys.has(selectedDateKey)}
		onclose={closeWorkout}
		ontoggle={() => toggleComplete(selectedWorkoutWithSpeeds!.id, selectedDateKey!)}
		onspeedchange={handleSpeedChange}
	/>
{/if}
