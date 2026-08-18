<script lang="ts">
	import { Gauge, RotateCcw, Search } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	import { apiRequest } from '$lib/api';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';

	let { data }: PageProps = $props();
	let search = $state('');
	let speeds = $state(
		untrack(
			() =>
				Object.fromEntries(
					data.exercises.map((exercise) => [exercise.id, exercise.speedPercent])
				) as Record<number, number>
		)
	);
	let savingId = $state<number | null>(null);
	let savedId = $state<number | null>(null);
	let errorMessage = $state('');

	const filteredExercises = $derived(
		data.exercises.filter((exercise) =>
			exercise.name.toLowerCase().includes(search.trim().toLowerCase())
		)
	);
	const customizedCount = $derived(Object.values(speeds).filter((speed) => speed !== 100).length);

	async function saveSpeed(exerciseId: number, speedPercent: number) {
		speeds[exerciseId] = speedPercent;
		errorMessage = '';
		savingId = exerciseId;
		try {
			await apiRequest(`/api/app/fitness/exercises/${exerciseId}/speed`, {
				method: 'PUT',
				body: JSON.stringify({ speedPercent })
			});
		} catch {
			errorMessage = 'The exercise speed could not be saved. Please try again.';
			savingId = null;
			return;
		}
		savingId = null;
		savedId = exerciseId;
		setTimeout(() => {
			if (savedId === exerciseId) savedId = null;
		}, 1800);
	}

	async function resetSpeed(exerciseId: number) {
		errorMessage = '';
		savingId = exerciseId;
		try {
			await apiRequest(`/api/app/fitness/exercises/${exerciseId}/speed`, { method: 'DELETE' });
		} catch {
			errorMessage = 'The exercise speed could not be reset. Please try again.';
			savingId = null;
			return;
		}
		savingId = null;
		speeds[exerciseId] = 100;
		savedId = exerciseId;
	}
</script>

<svelte:head><title>Rep speeds · Self Improvement</title></svelte:head>

<main class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
	<div class="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
		<div class="max-w-2xl">
			<Badge><Gauge class="size-3.5" /> Rep-based exercises</Badge>
			<h1 class="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">Rep speeds</h1>
			<p class="mt-3 text-(--text)/56">
				Set a cadence for exercises measured in reps. Timed intervals are intentionally excluded and
				always keep their prescribed duration.
			</p>
		</div>
		<div class="flex items-center gap-3">
			<p class="text-sm text-(--text)/40">
				<span class="font-medium text-(--text)">{customizedCount}</span> customized
			</p>
			<Button href="/fitness" variant="ghost">Back to fitness</Button>
		</div>
	</div>

	{#if errorMessage}<Alert variant="destructive" class="mb-6"
			><AlertDescription>{errorMessage}</AlertDescription></Alert
		>{/if}

	<div class="relative mb-6 max-w-lg">
		<Search
			class="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-(--text)/40"
		/>
		<Input bind:value={search} placeholder="Search exercises…" class="pl-11" />
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each filteredExercises as exercise (exercise.id)}
			<Card class="gap-4">
				<div class="flex gap-4">
					<div class="size-24 shrink-0 overflow-hidden rounded-3xl bg-white">
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
							<span class="text-2xl font-medium tabular-nums">{speeds[exercise.id]}%</span
							>{#if savedId === exercise.id}<span
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
						><RotateCcw class="mr-1.5 size-3.5" /> Reset to 100%</Button
					>
				{/if}
			</Card>
		{/each}
	</div>

	{#if filteredExercises.length === 0}<Card class="mt-4 text-center text-(--text)/56"
			>No exercises match “{search}”.</Card
		>{/if}
</main>
