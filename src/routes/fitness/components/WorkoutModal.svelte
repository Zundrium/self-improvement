<script lang="ts">
	import { Check, Clock3, Gauge, Layers3, Play } from '@lucide/svelte';
	import type { AudioManager } from '$lib/audio/audio-manager';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import type { Workout } from '../fitness';
	import WorkoutSession from './WorkoutSession.svelte';

	interface Props {
		workout: Workout;
		audioManager: AudioManager;
		completed: boolean;
		saving?: boolean;
		onclose: () => void;
		ontoggle: () => void | Promise<void>;
		onspeedchange: (exerciseId: number, speedPercent: number) => void;
	}

	let {
		workout,
		audioManager,
		completed,
		saving = false,
		onclose,
		ontoggle,
		onspeedchange
	}: Props = $props();
	let isSessionActive = $state(false);
	const focus = $derived(workout.title.replace(/^Total Body - Day \d+:\s*/, ''));
	const hasRepExercises = $derived(workout.activities.some((activity) => activity.type === 'reps'));
	function startSession() {
		isSessionActive = true;
	}

	async function handleSessionComplete() {
		if (!completed) await ontoggle();
		isSessionActive = false;
	}
</script>

{#if isSessionActive}
	<WorkoutSession
		{workout}
		{audioManager}
		oncomplete={handleSessionComplete}
		oncancel={() => (isSessionActive = false)}
		{onspeedchange}
	/>
{:else}
	<Dialog open onOpenChange={(open) => !open && onclose()}>
		<DialogContent class="max-h-[92vh] max-w-3xl overflow-y-auto p-0" showCloseButton>
			<div class="p-4 sm:p-6">
				<DialogHeader class="gap-2 pr-8 text-left">
					<Badge class="w-fit">Day {workout.day}</Badge>
					<DialogTitle class="text-2xl sm:text-3xl">{focus}</DialogTitle>
					<DialogDescription class="sr-only"
						>Workout details for day {workout.day}</DialogDescription
					>
				</DialogHeader>

				<div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-(--text)/56">
					<span class="flex items-center gap-2"
						><Layers3 class="size-4" /> {workout.sets} {workout.sets === 1 ? 'set' : 'sets'}</span
					>
					<span class="flex items-center gap-2"
						><Clock3 class="size-4" /> {workout.restBetweenExercises}s rests</span
					>
					{#if hasRepExercises}<span class="flex items-center gap-2"
							><Gauge class="size-4" /> Rep cadence applied</span
						>{/if}
				</div>

				<Card class="mt-4 gap-0 overflow-hidden p-0">
					{#each workout.activities as activity, index (activity.id)}
						<div class="flex items-center gap-3 p-3">
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
								<Badge class={activity.speedPercent !== 100 ? 'bg-(--text) text-(--bg)' : ''}
									>{activity.speedPercent}%</Badge
								>
							{/if}
						</div>
						{#if index < workout.activities.length - 1}<Separator />{/if}
					{/each}
				</Card>

				<div class="mt-4 grid grid-cols-2 gap-3">
					<Button variant="ghost" class="w-full px-2" disabled={saving} onclick={ontoggle}>
						<Check class="mr-1 size-4" />
						{completed ? 'Completed' : 'Mark complete'}
					</Button>
					<Button class="w-full px-2" onclick={startSession}>
						<Play class="mr-1 size-4 fill-current" /> Start workout
					</Button>
				</div>
			</div>
		</DialogContent>
	</Dialog>
{/if}
