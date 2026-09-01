<script lang="ts">
	import { Check, Play, Square } from '@lucide/svelte';
	import { onDestroy, untrack } from 'svelte';
	import {
		BottomActionBar,
		BottomActionButton,
		BottomActionGroup
	} from '$lib/components/ui/bottom-action-bar';
	import { Button } from '$lib/components/ui/button';
	import { getTrackerColors, trackerGradient } from '$lib/trackers/registry';
	import {
		breathingDurationSeconds,
		breathingStep,
		formatTimer,
		type BreathingCompletion,
		type SaveState
	} from '../breathing';
	import {
		breathingDisabledFade,
		breathingEnter,
		breathingHoldProgress,
		breathingPhaseScale,
		breathingPhaseText
	} from '../breathingMotion';

	type TimerStatus = 'idle' | 'running' | 'stopping' | 'completed';
	type Props = {
		localDate: string;
		rounds: number;
		includeHold: boolean;
		saveState: SaveState;
		complete?: boolean;
		interactive?: boolean;
		oncomplete: (completion: BreathingCompletion) => void;
		onretry: () => void;
	};

	let {
		localDate,
		rounds,
		includeHold,
		saveState,
		complete = false,
		interactive = true,
		oncomplete,
		onretry
	}: Props = $props();
	const colors = getTrackerColors('breathing');
	let loadedDate = $state(untrack(() => localDate));
	let loadedComplete = $state(untrack(() => complete));
	let status = $state<TimerStatus>(untrack(() => (complete ? 'completed' : 'idle')));
	let elapsedMilliseconds = $state(0);
	let startedAt = 0;
	let timerId: number | undefined;
	let resetTimerId: number | undefined;

	const durationSeconds = $derived(breathingDurationSeconds(includeHold, rounds));
	const durationMilliseconds = $derived(durationSeconds * 1000);
	const step = $derived(breathingStep(elapsedMilliseconds, includeHold, rounds));
	const remainingSeconds = $derived(
		Math.max(0, durationSeconds - Math.floor(elapsedMilliseconds / 1000))
	);
	const displayedRemainingSeconds = $derived(status === 'completed' ? 0 : remainingSeconds);
	const actionsVisible = $derived(
		(status === 'idle' && interactive) ||
			status === 'running' ||
			status === 'stopping' ||
			saveState === 'error'
	);

	$effect(() => resetForDate(localDate, complete));
	onDestroy(clearTimers);

	function resetForDate(nextDate: string, isComplete: boolean) {
		if (loadedDate === nextDate && loadedComplete === isComplete) return;
		clearTimers();
		loadedDate = nextDate;
		loadedComplete = isComplete;
		status = isComplete ? 'completed' : 'idle';
		elapsedMilliseconds = isComplete ? durationMilliseconds : 0;
		startedAt = 0;
	}

	function startExercise() {
		startedAt = Date.now();
		elapsedMilliseconds = 0;
		status = 'running';
		scheduleTimerUpdate();
	}

	function updateTimer() {
		elapsedMilliseconds = Math.min(durationMilliseconds, Date.now() - startedAt);
		if (elapsedMilliseconds >= durationMilliseconds) return completeExercise();
		scheduleTimerUpdate();
	}

	function scheduleTimerUpdate() {
		if (timerId) window.clearTimeout(timerId);
		const elapsedInSecond = elapsedMilliseconds % 1000;
		timerId = window.setTimeout(updateTimer, Math.max(1, Math.ceil(1000 - elapsedInSecond)));
	}

	function completeExercise() {
		clearTimer();
		elapsedMilliseconds = durationMilliseconds;
		status = 'completed';
		oncomplete({ localDate, startedAt, includeHold });
	}

	function stopExercise() {
		clearTimer();
		status = 'stopping';
		const resetDelay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100;
		resetTimerId = window.setTimeout(resetExercise, resetDelay);
	}

	function resetExercise() {
		elapsedMilliseconds = 0;
		startedAt = 0;
		status = 'idle';
		resetTimerId = undefined;
	}

	function clearTimers() {
		clearTimer();
		if (resetTimerId) window.clearTimeout(resetTimerId);
		resetTimerId = undefined;
	}

	function clearTimer() {
		if (timerId) window.clearTimeout(timerId);
		timerId = undefined;
	}
</script>

{#snippet actions()}
	<div class="w-full" use:breathingDisabledFade={status === 'stopping'}>
		<BottomActionGroup>
			{#if interactive && status !== 'completed'}
				<BottomActionButton
					tone={status === 'idle' ? 'primary' : 'neutral'}
					disabled={status === 'stopping'}
					onclick={status === 'idle' ? startExercise : stopExercise}
				>
					{#if status === 'idle'}
						<Play class="mr-2 size-4 fill-current" /> Start breathing
					{:else}
						<Square class="mr-2 size-4" /> Stop
					{/if}
				</BottomActionButton>
			{:else if saveState === 'error'}
				<BottomActionButton tone="primary" onclick={onretry}>Save breathing</BottomActionButton>
			{/if}
		</BottomActionGroup>
	</div>
{/snippet}

<section
	class="flex flex-1 flex-col items-center justify-center gap-5 py-4"
	aria-label="Breathing timer"
	data-motion-page-enter="custom"
	use:breathingEnter
>
	<div class="flex min-h-12 items-center justify-center">
		<p
			class="text-5xl font-semibold tracking-[-0.04em] tabular-nums sm:text-6xl"
			style={`color: ${colors.primary}`}
			role="timer"
			aria-label={`${displayedRemainingSeconds} seconds remaining`}
		>
			{formatTimer(displayedRemainingSeconds)}
		</p>
	</div>

	<div class="relative flex size-72 items-center justify-center sm:size-80">
		<div
			class="relative flex size-full items-center justify-center rounded-full text-white shadow-lg shadow-black/10 will-change-transform"
			style:background={trackerGradient(colors)}
			data-breathing-visual
			use:breathingPhaseScale={{
				phase: step.phase.id,
				seconds: step.phase.seconds,
				running: status === 'running'
			}}
			aria-hidden="true"
		>
			<div
				class="absolute inset-[20%] rounded-full bg-white/24 will-change-transform"
				data-breathing-hold-progress
				use:breathingHoldProgress={{
					phase: step.phase.id,
					seconds: step.phase.seconds,
					running: status === 'running'
				}}
			></div>
			{#if status === 'completed'}
				<Check class="relative size-12" />
			{/if}
		</div>
		{#if status !== 'completed'}
			<p
				class="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-semibold text-white"
				aria-live="polite"
				use:breathingPhaseText={status === 'running'}
			>
				{step.phase.label}
			</p>
		{/if}
	</div>


	<div class="hidden w-full sm:block">
		{@render actions()}
	</div>
</section>

{#if actionsVisible}
	<BottomActionBar>
		{@render actions()}
	</BottomActionBar>
{/if}
