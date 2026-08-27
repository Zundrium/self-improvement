<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { Check, LoaderCircle, Minus, Pause, Play, Plus, RotateCcw, Square } from '@lucide/svelte';
	import type { AudioManager } from '$lib/audio/audio-manager';
	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import { Button } from '$lib/components/ui/button';
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
		if (status === 'idle') startedAt = Date.now();
		deadline = Date.now() + remainingSeconds * 1000;
		status = 'running';
		timerId = window.setInterval(updateTimer, 250);
	}

	function pauseTimer() {
		updateRemainingTime();
		if (remainingSeconds === 0) return completeTimer();
		clearTimer();
		status = 'paused';
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
	}

	function resetTimer() {
		status = 'idle';
		remainingSeconds = durationSeconds;
		startedAt = 0;
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
</script>

{#snippet actions()}
	<div
		class="grid gap-3 {status === 'running' || status === 'paused' ? 'grid-cols-[1fr_auto]' : ''}"
	>
		<Button size="lg" class="w-full" aria-label={timerLabel} onclick={handlePrimaryAction}>
			{#if status === 'running'}
				<Pause class="mr-2 size-4" />
			{:else if status === 'completed'}
				<RotateCcw class="mr-2 size-4" />
			{:else}
				<Play class="mr-2 size-4 fill-current" />
			{/if}
			{timerLabel}
		</Button>
		{#if status === 'running' || status === 'paused'}
			<Button
				variant="ghost"
				size="icon"
				class="size-11"
				aria-label="Stop meditation"
				onclick={stopTimer}
			>
				<Square class="size-4" />
			</Button>
		{/if}
	</div>
{/snippet}

<section aria-label="Meditation timer">
	<div class="flex flex-col items-center gap-4 pt-2">
		<div data-meditation-icon>
			<MeditationIcon class="size-56 sm:size-64" color={colors.primary} />
		</div>

		<div class="flex w-full items-center justify-center gap-2 sm:gap-4" data-meditation-timer>
			<Button
				variant="ghost"
				size="icon"
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
				variant="ghost"
				size="icon"
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

		<div class="min-h-5 text-center text-sm text-(--text)/56" aria-live="polite">
			{#if status === 'paused'}
				Timer paused
			{:else if saveState === 'saving'}
				<span class="inline-flex items-center gap-2"
					><LoaderCircle size={15} data-motion-spin /> Saving session</span
				>
			{:else if saveState === 'saved'}
				<span class="inline-flex items-center gap-2"><Check size={15} /> Session saved</span>
			{:else if saveState === 'error'}
				<button
					class="link cursor-pointer font-medium text-(--text)"
					type="button"
					onclick={onretry}>Save again</button
				>
			{/if}
		</div>
	</div>
</section>

<BottomActionBar>
	{@render actions()}
</BottomActionBar>
