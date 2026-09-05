<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { onDestroy, onMount, untrack } from 'svelte';
import { Check, LoaderCircle, Minus, Pause, Play, Plus, RotateCcw, Square } from '@lucide/svelte';
import type { AudioManager } from '$lib/audio/audio-manager';
import { BottomActionButton, BottomActionGroup } from '$lib/components/ui/bottom-action-bar';
import { Button } from '$lib/components/ui/button';
import { spin } from '$lib/motion/gsap';
import { getTrackerColors } from '$lib/trackers/registry';
import MeditationIcon from '$lib/trackers/meditationIcon.svelte';
import {
	DEFAULT_DURATION_SECONDS,
	formatTimer,
	getLocalDate,
	MAXIMUM_DURATION_SECONDS,
	MINIMUM_DURATION_SECONDS,
	type MeditationCompletion,
	type SaveState
} from '../meditation';
import { singingBowlUrl } from '../sounds';
import { clearPausedSession, loadPausedSession, savePausedSession } from '$lib/routines/session';

type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
type Props = {
	audioManager?: AudioManager;
	initialDurationSeconds?: number;
	saveState: SaveState;
	oncomplete: (completion: MeditationCompletion) => void;
	onretry: () => void;
};

let {
	audioManager,
	initialDurationSeconds = DEFAULT_DURATION_SECONDS,
	saveState,
	oncomplete,
	onretry
}: Props = $props();
const colors = getTrackerColors('meditation');
let durationSeconds = $state(untrack(() => initialDurationSeconds));
let remainingSeconds = $state(untrack(() => initialDurationSeconds));
let status = $state<TimerStatus>('idle');
let timerId: number | undefined;
let deadline = 0;
let startedAt = 0;

const canAdjust = $derived(status === 'idle');
const timerLabel = $derived(getTimerLabel(status));

onDestroy(clearTimer);
onMount(() => {
	const recovered = loadPausedSession<{
		durationSeconds: number;
		remainingSeconds: number;
		startedAt: number;
	}>('meditation-session', isMeditationSnapshot);
	if (recovered && status === 'idle') {
		durationSeconds = recovered.durationSeconds;
		remainingSeconds = recovered.remainingSeconds;
		startedAt = recovered.startedAt;
		status = 'paused';
	}
	const onVisibilityChange = () => {
		if (document.visibilityState === 'hidden' && status === 'running') pauseTimer(false);
	};
	document.addEventListener('visibilitychange', onVisibilityChange);
	return () => document.removeEventListener('visibilitychange', onVisibilityChange);
});

function adjustDuration(change: number) {
	if (!canAdjust) return;
	durationSeconds = Math.min(
		MAXIMUM_DURATION_SECONDS,
		Math.max(MINIMUM_DURATION_SECONDS, durationSeconds + change)
	);
	remainingSeconds = durationSeconds;
}

function handlePrimaryAction() {
	if (status === 'completed') resetTimer();
	toggleTimer();
}

function toggleTimer() {
	if (status === 'running') pauseTimer();
	else startTimer();
}

function startTimer() {
	clearTimer();
	if (status === 'idle') startedAt = Date.now();
	deadline = Date.now() + remainingSeconds * 1000;
	status = 'running';
	timerId = window.setInterval(updateTimer, 250);
}

function pauseTimer(allowCompletion = true) {
	updateRemainingTime();
	if (remainingSeconds === 0 && allowCompletion) return completeTimer();
	clearTimer();
	status = 'paused';
	savePausedSession('meditation-session', { durationSeconds, remainingSeconds, startedAt });
}

function updateTimer() {
	updateRemainingTime();
	if (remainingSeconds === 0) completeTimer();
}

function updateRemainingTime() {
	remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function completeTimer() {
	clearTimer();
	status = 'completed';
	clearPausedSession('meditation-session');
	void audioManager?.play(singingBowlUrl);
	oncomplete(createCompletion());
}

function createCompletion(): MeditationCompletion {
	return {
		id: crypto.randomUUID(),
		localDate: getLocalDate(),
		durationSeconds,
		startedAt
	};
}

function stopTimer() {
	clearTimer();
	status = 'idle';
	remainingSeconds = durationSeconds;
	startedAt = 0;
	clearPausedSession('meditation-session');
}

function resetTimer() {
	status = 'idle';
	remainingSeconds = durationSeconds;
	startedAt = 0;
	clearPausedSession('meditation-session');
}

function clearTimer() {
	if (timerId) window.clearInterval(timerId);
	timerId = undefined;
}

function getTimerLabel(timerStatus: TimerStatus) {
	if (timerStatus === 'running') return 'Pause meditation';
	if (timerStatus === 'paused') return 'Resume meditation';
	if (timerStatus === 'completed') return 'Meditate again';
	return 'Start meditation';
}

function isMeditationSnapshot(
	value: unknown
): value is { durationSeconds: number; remainingSeconds: number; startedAt: number } {
	if (!value || typeof value !== 'object') return false;
	const snapshot = value as Record<string, unknown>;
	return [snapshot.durationSeconds, snapshot.remainingSeconds, snapshot.startedAt].every(
		Number.isFinite
	);
}
</script>

{#snippet actions()}
	<BottomActionGroup>
		<BottomActionButton tone="primary" aria-label={timerLabel} onclick={handlePrimaryAction}>
			{#if status === 'running'}
				<Pause class="mr-2 size-4" />
			{:else if status === 'completed'}
				<RotateCcw class="mr-2 size-4" />
			{:else}
				<Play class="mr-2 size-4 fill-current" />
			{/if}
			{timerLabel}
		</BottomActionButton>
		{#if status === 'running' || status === 'paused'}
			<BottomActionButton format="icon" aria-label="Stop meditation" onclick={stopTimer}>
				<Square class="size-4" />
			</BottomActionButton>
		{/if}
	</BottomActionGroup>
{/snippet}

<section aria-label="Meditation timer">
	<div class="flex flex-col items-center gap-4 pt-2">
		<div data-meditation-icon>
			<MeditationIcon class="size-56 sm:size-64" color={colors.secondary} />
		</div>

		<div class="flex w-full items-center justify-center gap-2 sm:gap-4" data-meditation-timer>
			<Button
				profile="plain"
				size="medium" format="icon"
				aria-label="Decrease duration by one minute"
				disabled={!canAdjust || durationSeconds === MINIMUM_DURATION_SECONDS}
				onclick={() => adjustDuration(-60)}
			>
				<Minus size={20} />
			</Button>
			<p
				class="w-36 text-center text-5xl font-semibold tracking-[-0.06em] tabular-nums sm:w-44 sm:text-6xl"
			>
				{formatTimer(remainingSeconds)}
			</p>
			<Button
				profile="plain"
				size="medium" format="icon"
				aria-label="Increase duration by one minute"
				disabled={!canAdjust || durationSeconds === MAXIMUM_DURATION_SECONDS}
				onclick={() => adjustDuration(60)}
			>
				<Plus size={20} />
			</Button>
		</div>

		<div class="hidden w-full sm:block">
			{@render actions()}
		</div>

		<div class="min-h-5 text-center text-sm text-(--text-muted)" aria-live="polite">
			{#if status === 'paused'}
				Timer paused
			{:else if saveState === 'saving'}
				<span class="inline-flex items-center gap-2"
					><span class="inline-flex" use:spin><LoaderCircle size={15} /></span> Saving session</span
				>
			{:else if saveState === 'saved'}
				<span class="inline-flex items-center gap-2"><Check size={15} /> Session saved</span>
			{:else if saveState === 'error'}
				<Button
					profile="text"
					size="small"
					class="link cursor-pointer"
					type="button"
					onclick={onretry}>Save again</Button
				>
			{/if}
		</div>
	</div>
</section>

<PageActionBar>
	{@render actions()}
</PageActionBar>
