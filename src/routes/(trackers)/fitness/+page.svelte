<script lang="ts">
	import { Dumbbell } from '@lucide/svelte';
	import { onMount, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { AudioManager } from '$lib/audio/audio-manager';
	import DateSelector from '$lib/components/date-selector.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '$lib/components/ui/empty';
	import WorkoutDay from './components/WorkoutDay.svelte';
	import type { Workout } from './fitness';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
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
		audioManager.setVolume(1);
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

	function fitnessHref(date: string) {
		return date === data.today ? '/fitness' : `/fitness?date=${date}`;
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
	}

	async function saveCompletion(workoutId: number, date: string, deleting: boolean) {
		const progressUrl = `/fitness/api/progress/${workoutId}`;
		try {
			const response = await fetch(deleting ? `${progressUrl}?date=${date}` : progressUrl, {
				method: deleting ? 'DELETE' : 'PUT',
				headers: deleting ? undefined : { 'content-type': 'application/json' },
				body: deleting ? undefined : JSON.stringify({ completedDate: date })
			});
			return response.ok;
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

<main
	class="mx-auto min-h-[calc(100vh-7rem)] w-full max-w-3xl space-y-8 px-4 py-8 pb-28 sm:px-6 sm:py-10"
>
	<DateSelector
		date={data.date}
		today={data.today}
		markedDates={[...completedDateKeys]}
		hrefForDate={fitnessHref}
	/>

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
		<Empty class="py-20">
			<EmptyMedia><Dumbbell class="size-6" /></EmptyMedia>
			<EmptyTitle>Rest day</EmptyTitle>
			<EmptyDescription>The 30-day program has no workout scheduled for this date.</EmptyDescription
			>
		</Empty>
	{/if}
</main>
