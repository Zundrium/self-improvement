<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { apiRequest } from '$lib/api';
	import { AudioManager } from '$lib/audio/audio-manager';
	import { useDateSelectorState } from '$lib/components/dateSelectorState.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import FitnessRestDay from './components/fitnessRestDay.svelte';
	import WorkoutDay from './components/workoutDay.svelte';
	import type { Workout } from './fitness';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const dateSelectorState = useDateSelectorState();
	const completedDateKeys = new SvelteSet<string>(
		untrack(() => data.completedDays.map((day) => day.dateKey))
	);
	const savingDateKeys = new SvelteSet<string>();
	let exerciseSpeeds = $state(initialExerciseSpeeds());
	let errorMessage = $state('');
	let audioManager = $state<AudioManager>();

	const selectedWorkout = $derived(
		data.program.workouts.find((workout) => workout.day === Number(data.date.slice(-2)))
	);
	const selectedWorkoutWithSpeeds = $derived<Workout | undefined>(
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
			: undefined
	);

	onMount(() => {
		audioManager = new AudioManager();
		return () => audioManager?.destroy();
	});

	function initialExerciseSpeeds() {
		return untrack(
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
		);
	}

	function handleSpeedChange(exerciseId: number, speedPercent: number) {
		exerciseSpeeds = { ...exerciseSpeeds, [exerciseId]: speedPercent };
	}

	async function toggleComplete(workoutId: number) {
		const date = data.date;
		if (savingDateKeys.has(date)) return;
		errorMessage = '';
		const wasCompleted = completedDateKeys.has(date);
		setCompleted(date, !wasCompleted);
		savingDateKeys.add(date);
		const saved = await saveCompletion(workoutId, date, wasCompleted);
		savingDateKeys.delete(date);
		if (!saved) restoreCompletion(date, wasCompleted);
	}

	function setCompleted(date: string, completed: boolean) {
		if (completed) completedDateKeys.add(date);
		else completedDateKeys.delete(date);
		dateSelectorState.mark(date, completed);
	}

	async function saveCompletion(workoutId: number, date: string, deleting: boolean) {
		const progressUrl = `/api/app/fitness/progress/${workoutId}`;
		try {
			await apiRequest(deleting ? `${progressUrl}?date=${date}` : progressUrl, {
				method: deleting ? 'DELETE' : 'PUT',
				body: deleting ? undefined : JSON.stringify({ completedDate: date })
			});
			return true;
		} catch {
			return false;
		}
	}

	function restoreCompletion(date: string, completed: boolean) {
		setCompleted(date, completed);
		errorMessage = 'Your progress could not be saved. Please try again.';
	}
</script>

<svelte:head>
	<title>{data.program.name} · Self Improvement</title>
	<meta name="description" content={data.program.description} />
</svelte:head>

<TrackerPage
	class="flex min-h-0 max-w-3xl flex-col"
	contentClass="flex min-h-0 flex-1 flex-col gap-8 space-y-0"
>
	{#if errorMessage}
		<Alert variant="destructive">
			<AlertDescription>{errorMessage}</AlertDescription>
		</Alert>
	{/if}

	{#if selectedWorkoutWithSpeeds}
		<WorkoutDay
			workout={selectedWorkoutWithSpeeds}
			{audioManager}
			completed={completedDateKeys.has(data.date)}
			saving={savingDateKeys.has(data.date)}
			ontoggle={() => toggleComplete(selectedWorkoutWithSpeeds.id)}
			onspeedchange={handleSpeedChange}
		/>
	{:else}
		<FitnessRestDay />
	{/if}
</TrackerPage>
