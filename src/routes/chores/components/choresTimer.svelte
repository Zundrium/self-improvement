<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { BrushCleaning, Check, LoaderCircle, Pause, Play, RotateCcw, Square } from '@lucide/svelte';
	import {
		BottomActionBar,
		BottomActionButton,
		BottomActionGroup
	} from '$lib/components/ui/bottom-action-bar';
	import { Button } from '$lib/components/ui/button';
	import { spin } from '$lib/motion/gsap';
	import { getTrackerColors } from '$lib/trackers/registry';
	import {
		CHORES_DURATION_SECONDS,
		formatTimer,
		type ChoresCompletion,
		type SaveState
	} from '../chores';

	type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
	type Props = {
		localDate: string;
		complete: boolean;
		interactive: boolean;
		saveState: SaveState;
		oncomplete: (completion: ChoresCompletion) => void;
		onretry: () => void;
	};

	let { localDate, complete, interactive, saveState, oncomplete, onretry }: Props = $props();
	const colors = getTrackerColors('chores');
	let status = $state<TimerStatus>(untrack(() => (complete ? 'completed' : 'idle')));
	let remainingSeconds = $state(untrack(() => (complete ? 0 : CHORES_DURATION_SECONDS)));
	let timerId: number | undefined;
	let deadline = 0;
	let startedAt = 0;

	const timerLabel = $derived(getTimerLabel(status));

	onDestroy(clearTimer);

	function handlePrimaryAction() {
		if (status === 'completed') resetTimer();
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
		if (remainingSeconds === 0) return finishTimer();
		clearTimer();
		status = 'paused';
	}

	function updateTimer() {
		updateRemainingTime();
		if (remainingSeconds === 0) finishTimer();
	}

	function updateRemainingTime() {
		remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
	}

	function finishTimer() {
		clearTimer();
		status = 'completed';
		oncomplete({ localDate, startedAt });
	}

	function stopTimer() {
		clearTimer();
		status = 'idle';
		remainingSeconds = CHORES_DURATION_SECONDS;
		startedAt = 0;
	}

	function resetTimer() {
		status = 'idle';
		remainingSeconds = CHORES_DURATION_SECONDS;
		startedAt = 0;
	}

	function clearTimer() {
		if (timerId) window.clearInterval(timerId);
		timerId = undefined;
	}

	function getTimerLabel(timerStatus: TimerStatus) {
		if (timerStatus === 'running') return 'Pause timer';
		if (timerStatus === 'paused') return 'Resume timer';
		if (timerStatus === 'completed') return 'Start another 10 minutes';
		return 'Start';
	}
</script>

{#snippet actions()}
	{#if interactive}
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
				<BottomActionButton format="icon" aria-label="Stop timer" onclick={stopTimer}>
					<Square class="size-4" />
				</BottomActionButton>
			{/if}
		</BottomActionGroup>
	{/if}
{/snippet}

<section aria-label="Chores timer" class="flex flex-1 flex-col items-center justify-center gap-6 py-8">
	<BrushCleaning class="size-40 sm:size-48" strokeWidth={1.25} color={colors.primary} />

	<div class="space-y-3 text-center">
		<p class="text-6xl font-semibold tracking-[-0.06em] tabular-nums sm:text-7xl">
			{formatTimer(remainingSeconds)}
		</p>
		<div class="min-h-5 text-sm text-(--text)/56" aria-live="polite">
			{#if status === 'paused'}
				Timer paused
			{:else if saveState === 'saving'}
				<span class="inline-flex items-center gap-2">
					<span class="inline-flex" use:spin><LoaderCircle size={15} /></span>
					Saving completion
				</span>
			{:else if saveState === 'error'}
				<Button variant="link" size="small" class="link cursor-pointer" type="button" onclick={onretry}>
					Save again
				</Button>
			{:else if status === 'completed' || complete}
				<span class="inline-flex items-center gap-2"><Check size={15} /> Done for today</span>
			{:else if interactive}
				Any chore counts
			{:else}
				Not completed
			{/if}
		</div>
	</div>

	<div class="hidden w-full sm:block">
		{@render actions()}
	</div>
</section>

<BottomActionBar>
	{@render actions()}
</BottomActionBar>
