<script lang="ts">
import { Search } from '@lucide/svelte';
import { untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import type { ExerciseData } from '$lib/api-types';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Slider } from '$lib/components/ui/slider';
import { toast } from '$lib/components/ui/toast';

let { exercises }: ExerciseData = $props();
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
let errorMessage = $state('');
const filteredExercises = $derived(
	exercises.filter((exercise) => exercise.name.toLowerCase().includes(search.trim().toLowerCase()))
);

async function saveSpeed(exerciseId: number, speedPercent: number) {
	speeds[exerciseId] = speedPercent;
	if (!(await persistSpeed(exerciseId, { method: 'PUT', body: JSON.stringify({ speedPercent }) })))
		return;
	toast.success('Exercise speed updated.');
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

<Card>
	<CardHeader>
		<CardTitle>Rep speeds</CardTitle>
	</CardHeader>
	<CardContent class="gap-5">
		<div class="relative">
			<Search
				class="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-(--text-muted)"
			/>
			<Input
				bind:value={search}
				placeholder="Search exercises…"
				aria-label="Search exercises"
				class="pl-11"
			/>
		</div>

		{#if errorMessage}
			<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
		{/if}

		<div class="space-y-1">
			{#each filteredExercises as exercise (exercise.id)}
				<section
					class="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 py-3 sm:grid-cols-[3rem_minmax(8rem,1fr)_minmax(15rem,2fr)] sm:gap-x-4"
					aria-label={exercise.name}
				>
					<div class="size-12 overflow-hidden rounded-2xl bg-(--text)/4">
						<img
							src={exercise.imageUrl}
							alt=""
							class="size-full object-contain"
							loading="lazy"
							decoding="async"
						/>
					</div>
					<h2 class="truncate text-sm font-medium">{exercise.name}</h2>
					<div class="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
						<span class="shrink-0 text-xs font-medium text-(--text-muted)">Speed</span>
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
						<output class="w-12 shrink-0 text-right text-sm font-medium tabular-nums">
							{speeds[exercise.id]}%
						</output>
					</div>
				</section>
			{/each}
		</div>

		{#if filteredExercises.length === 0}
			<p class="py-8 text-center text-sm text-(--text-muted)">No exercises match “{search}”.</p>
		{/if}
	</CardContent>
</Card>
