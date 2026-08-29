<script lang="ts">
	import { RotateCcw, Search } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import type { ExerciseData } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
	import { toast } from '$lib/components/ui/toast';
	import { getTrackerColors } from '$lib/trackers/registry';

	let { exercises }: ExerciseData = $props();
	const colors = getTrackerColors('fitness');
	let search = $state('');
	let speeds = $state(
		untrack(
			() =>
				Object.fromEntries(
					exercises.map((exercise) => [exercise.id, exercise.speedPercent])
				) as Record<number, number>
		)
	);
	let savingId = $state<number | null>(null);
	let savedId = $state<number | null>(null);
	let errorMessage = $state('');
	const filteredExercises = $derived(
		exercises.filter((exercise) =>
			exercise.name.toLowerCase().includes(search.trim().toLowerCase())
		)
	);
	const customizedCount = $derived(Object.values(speeds).filter((speed) => speed !== 100).length);

	async function saveSpeed(exerciseId: number, speedPercent: number) {
		speeds[exerciseId] = speedPercent;
		if (
			!(await persistSpeed(exerciseId, { method: 'PUT', body: JSON.stringify({ speedPercent }) }))
		)
			return;
		savedId = exerciseId;
		toast.success('Exercise speed updated.');
		setTimeout(() => savedId === exerciseId && (savedId = null), 1800);
	}

	async function resetSpeed(exerciseId: number) {
		if (!(await persistSpeed(exerciseId, { method: 'DELETE' }))) return;
		speeds[exerciseId] = 100;
		savedId = exerciseId;
		toast.success('Exercise speed reset.');
	}

	async function persistSpeed(exerciseId: number, request: RequestInit) {
		errorMessage = '';
		savingId = exerciseId;
		try {
			await apiRequest(`/api/app/fitness/exercises/${exerciseId}/speed`, request);
			return true;
		} catch {
			errorMessage = 'The exercise speed could not be saved. Please try again.';
			return false;
		} finally {
			savingId = null;
		}
	}
</script>

<TrackerSection
	title="Rep speeds"
	description={`Set a cadence for rep-based exercises. ${customizedCount} customized.`}
	{colors}
	contentClass="space-y-6"
>
	{#if errorMessage}
		<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
	{/if}

	<div class="relative max-w-lg">
		<Search
			class="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-(--text)/40"
		/>
		<Input bind:value={search} placeholder="Search exercises…" class="pl-11" />
	</div>

	<div class="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
		{#each filteredExercises as exercise (exercise.id)}
			<section class="space-y-4" aria-label={exercise.name}>
				<div class="flex gap-4">
					<div class="size-24 shrink-0 overflow-hidden rounded-3xl bg-(--text)/3">
						<img
							src={exercise.imageUrl}
							alt={exercise.name}
							class="size-full object-contain"
							loading="lazy"
						/>
					</div>
					<div class="min-w-0 flex-1">
						<h2 class="truncate font-medium">{exercise.name}</h2>
						<p class="mt-1 text-xs text-(--text)/40">
							Used in {exercise.workoutCount}
							{exercise.workoutCount === 1 ? 'workout' : 'workouts'}
						</p>
						<div class="mt-4 flex items-center justify-between">
							<span class="text-2xl font-medium tabular-nums">{speeds[exercise.id]}%</span>
							{#if savedId === exercise.id}<span
									class="text-xs text-emerald-600 dark:text-emerald-400">Saved</span
								>{/if}
						</div>
					</div>
				</div>
				<Slider
					type="single"
					bind:value={speeds[exercise.id]}
					min={50}
					max={150}
					step={5}
					onValueCommit={(value) => saveSpeed(exercise.id, value)}
					disabled={savingId === exercise.id}
					aria-label={`${exercise.name} speed`}
				/>
				<div class="flex items-center justify-between text-xs text-(--text)/40">
					<span>50% slower</span><span>150% faster</span>
				</div>
				{#if speeds[exercise.id] !== 100}
					<Button
						variant="ghost"
						size="sm"
						class="w-fit"
						disabled={savingId === exercise.id}
						onclick={() => resetSpeed(exercise.id)}
					>
						<RotateCcw class="mr-1.5 size-3.5" /> Reset to 100%
					</Button>
				{/if}
			</section>
		{/each}
	</div>

	{#if filteredExercises.length === 0}
		<p class="py-8 text-center text-(--text)/56">No exercises match “{search}”.</p>
	{/if}
</TrackerSection>
