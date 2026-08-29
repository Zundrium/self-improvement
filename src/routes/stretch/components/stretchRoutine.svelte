<script lang="ts">
import { CalendarOff, Check, LoaderCircle, Play, RotateCcw } from '@lucide/svelte';
import { onMount, untrack } from 'svelte';
import { AudioManager } from '$lib/audio/audio-manager';
import BottomActionBar from '$lib/components/bottomActionBar.svelte';
import type { GuidedRoutineActivity } from '$lib/components/guidedRoutine';
import GuidedRoutineRunner, {
	type GuidedRoutineSounds
} from '$lib/components/guidedRoutineRunner.svelte';
import { Button } from '$lib/components/ui/button';
import {
	STRETCH_ACTIVITY_IDS,
	STRETCH_DIFFICULTIES_BY_ACTIVITY,
	type StretchActivityId,
	type StretchDifficulties,
	type StretchDifficulty
} from '$lib/local/tracker-settings';
import { getTrackerColors } from '$lib/trackers/registry';
import {
	type SaveState,
	STRETCH_REST_SECONDS,
	type StretchCompletion,
	type StretchStep,
	stretchSteps
} from '../stretch';

type Props = {
	localDate: string;
	holdSeconds: number;
	difficulties: StretchDifficulties;
	scheduled: boolean;
	interactive: boolean;
	completedBefore: boolean;
	saveState: SaveState;
	oncomplete: (completion: StretchCompletion) => void;
	onretry: () => void;
	ondifficultychange: (activityId: StretchActivityId, difficulty: StretchDifficulty) => void;
};

let {
	localDate,
	holdSeconds,
	difficulties,
	scheduled,
	interactive,
	completedBefore,
	saveState,
	oncomplete,
	onretry,
	ondifficultychange
}: Props = $props();
const colors = getTrackerColors('stretch');
let selectedDifficulties = $state(untrack(() => ({ ...difficulties })));
const steps = $derived(stretchSteps(holdSeconds, selectedDifficulties));
const activities = $derived(steps.map(toGuidedActivity));
let loadedKey = $state(untrack(() => `${localDate}:${holdSeconds}`));
let isSessionActive = $state(false);
let audioManager = $state<AudioManager>();

const sounds: GuidedRoutineSounds = {
	tick: '/fitness/audio/second_tick.m4a',
	start: '/fitness/audio/activity_start_ping.m4a',
	complete: '/fitness/audio/complete.m4a',
	intro: '/fitness/audio/intro.m4a',
	beep: '/fitness/audio/beep.m4a',
	number: (value) => `/fitness/audio/voice/heart/${value}.m4a`
};

$effect(() => resetForInput(localDate, holdSeconds, difficulties));

onMount(() => {
	audioManager = new AudioManager();
	return () => audioManager?.destroy();
});

function resetForInput(
	nextDate: string,
	nextHoldSeconds: number,
	nextDifficulties: StretchDifficulties
) {
	const nextKey = `${nextDate}:${nextHoldSeconds}`;
	if (nextKey === loadedKey) return;
	loadedKey = nextKey;
	selectedDifficulties = { ...nextDifficulties };
	isSessionActive = false;
}

function toGuidedActivity(step: StretchStep): GuidedRoutineActivity {
	const shared = {
		id: step.id,
		name: step.name,
		imageUrl: step.imageUrl,
		imageVariants: step.imageVariants,
		selectedImageVariantId: step.selectedImageVariantId,
		detail: step.position,
		instruction: step.cue,
		repeats: step.sets
	};
	return step.durationSeconds === null
		? { ...shared, type: 'manual-reps', reps: 10 }
		: { ...shared, type: 'timed', durationSeconds: step.durationSeconds };
}

function selectDifficulty(activity: GuidedRoutineActivity, variantId: string) {
	if (
		typeof activity.id !== 'string' ||
		!STRETCH_ACTIVITY_IDS.includes(activity.id as StretchActivityId)
	)
		return;
	const activityId = activity.id as StretchActivityId;
	const difficulty = variantId as StretchDifficulty;
	if (
		!(STRETCH_DIFFICULTIES_BY_ACTIVITY[activityId] as readonly StretchDifficulty[]).includes(
			difficulty
		)
	)
		return;
	selectedDifficulties = { ...selectedDifficulties, [activityId]: difficulty };
	ondifficultychange(activityId, difficulty);
}

function completeRoutine() {
	isSessionActive = false;
	oncomplete({ localDate, holdSeconds });
}
</script>

{#snippet actions()}
	{#if saveState === 'error'}
		<div class="grid grid-cols-[1fr_auto] gap-3">
			<Button size="lg" class="w-full" onclick={onretry}>Save routine</Button>
			<Button
				size="icon"
				variant="ghost"
				class="size-11"
				onclick={() => (isSessionActive = true)}
				aria-label="Stretch again"
			>
				<RotateCcw class="size-4" />
			</Button>
		</div>
	{:else}
		<Button
			size="lg"
			class="w-full text-white"
			style={`background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`}
			disabled={!audioManager || saveState === 'saving'}
			onclick={() => (isSessionActive = true)}
		>
			{#if completedBefore}
				<RotateCcw class="mr-2 size-4" /> Stretch again
			{:else if scheduled}
				<Play class="mr-2 size-4 fill-current" /> Start routine
			{:else}
				<Play class="mr-2 size-4 fill-current" /> Stretch anyway
			{/if}
		</Button>
	{/if}
{/snippet}

{#if isSessionActive && audioManager}
	<GuidedRoutineRunner
		{activities}
		{audioManager}
		setCount={1}
		restBetweenActivitiesSeconds={STRETCH_REST_SECONDS}
		restBetweenSetsSeconds={STRETCH_REST_SECONDS}
		{sounds}
		activityLabel="Stretch"
		oncomplete={completeRoutine}
		oncancel={() => (isSessionActive = false)}
		onimagevariantcommit={selectDifficulty}
	/>
{:else}
	<section aria-label="Stretch routine" class="flex min-h-0 flex-1 flex-col gap-8">
		{#if !scheduled}
			<div class="flex min-h-72 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
				<CalendarOff class="size-12" style={`color: ${colors.primary}`} />
				<h2 class="mt-5 text-2xl font-medium tracking-[-0.04em]">Weekend recovery</h2>
				<p class="mt-2 max-w-sm text-sm leading-6 text-(--text)/56">
					The weekday routine resumes Monday.
				</p>
			</div>
		{:else}
			{#if completedBefore}
				<div
					class="flex items-center gap-3 rounded-3xl bg-emerald-500/10 px-5 py-4 text-emerald-700 dark:text-emerald-300"
				>
					<span class="flex size-9 items-center justify-center rounded-full bg-emerald-500/15">
						<Check class="size-4" />
					</span>
					<div>
						<p class="text-sm font-medium">Routine completed</p>
						<p class="text-xs opacity-72">This day counts toward your stretch streak.</p>
					</div>
				</div>
			{/if}

			<ol class="space-y-1">
				{#each steps as step, index (step.id)}
					<li class="flex items-center gap-3 rounded-2xl px-2 py-2 even:bg-(--text)/3">
						<span class="w-5 shrink-0 text-center text-xs text-(--text)/40">{index + 1}</span>
						<div class="size-14 shrink-0 overflow-hidden rounded-2xl bg-(--text)/3">
							<img src={step.imageUrl} alt="" class="size-full object-contain" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{step.name}</p>
							<p class="mt-0.5 text-xs text-(--text)/48">{step.position}</p>
						</div>
						<p class="text-sm tabular-nums text-(--text)/48">
							{step.durationSeconds === null ? '10 reps' : `${step.sets} × ${step.durationSeconds}s`}
						</p>
					</li>
				{/each}
			</ol>
		{/if}

		{#if saveState !== 'idle'}
			<div class="min-h-5 text-center text-sm text-(--text)/56" aria-live="polite">
				{#if saveState === 'saving'}
					<span class="inline-flex items-center gap-2">
						<LoaderCircle class="size-4" data-motion-spin /> Saving routine
					</span>
				{:else if saveState === 'saved'}
					<span class="inline-flex items-center gap-2">
						<Check class="size-4" /> Routine saved
					</span>
				{:else}
					Routine could not be saved.
				{/if}
			</div>
		{/if}

		{#if interactive}
			<div class="hidden sm:block">{@render actions()}</div>
		{/if}
	</section>

	{#if interactive}
		<BottomActionBar>{@render actions()}</BottomActionBar>
	{/if}
{/if}
