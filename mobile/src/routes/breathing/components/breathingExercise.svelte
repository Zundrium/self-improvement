<script lang="ts">
	import { Check, Play, Square } from '@lucide/svelte';
	import { onDestroy, onMount, untrack } from 'svelte';
	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { getTrackerColors } from '$lib/trackers/registry';
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
		breathingPhaseScale,
		breathingPhaseText
	} from '../breathingMotion';

	type TimerStatus = 'idle' | 'running' | 'stopping' | 'completed';
	type Props = {
		localDate: string;
		saveState: SaveState;
		complete?: boolean;
		interactive?: boolean;
		oncomplete: (completion: BreathingCompletion) => void;
		onretry: () => void;
	};

	const HOLD_PREFERENCE_KEY = 'breathing-include-hold';
	let {
		localDate,
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
	let includeHold = $state(true);
	let preferenceLoaded = $state(false);
	let startedAt = 0;
	let timerId: number | undefined;
	let resetTimerId: number | undefined;

	const durationSeconds = $derived(breathingDurationSeconds(includeHold));
	const durationMilliseconds = $derived(durationSeconds * 1000);
	const step = $derived(breathingStep(elapsedMilliseconds, includeHold));
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
	$effect(() => {
		if (preferenceLoaded) localStorage.setItem(HOLD_PREFERENCE_KEY, String(includeHold));
	});
	onMount(loadHoldPreference);
	onDestroy(clearTimers);

	function loadHoldPreference() {
		includeHold = localStorage.getItem(HOLD_PREFERENCE_KEY) !== 'false';
		preferenceLoaded = true;
	}

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
		timerId = window.setInterval(updateTimer, 100);
	}

	function updateTimer() {
		elapsedMilliseconds = Date.now() - startedAt;
		if (elapsedMilliseconds >= durationMilliseconds) completeExercise();
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
		if (timerId) window.clearInterval(timerId);
		timerId = undefined;
	}
</script>

{#snippet actions()}
	{#if interactive && status !== 'completed'}
		<div class="w-full" use:breathingDisabledFade={status === 'stopping'}>
			<Button
				size="lg"
				variant={status === 'idle' ? 'default' : 'ghost'}
				class="w-full text-white disabled:opacity-100"
				style={status === 'idle'
					? `background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
					: undefined}
				disabled={status === 'stopping'}
				onclick={status === 'idle' ? startExercise : stopExercise}
			>
				{#if status === 'idle'}
					<Play class="mr-2 size-4 fill-current" /> Start breathing
				{:else}
					<Square class="mr-2 size-4" /> Stop
				{/if}
			</Button>
		</div>
	{:else if saveState === 'error'}
		<Button size="lg" class="w-full" onclick={onretry}>Save breathing</Button>
	{/if}
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
			class="flex size-full items-center justify-center rounded-full text-white shadow-lg shadow-black/10 will-change-transform"
			style={`background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`}
			data-breathing-visual
			use:breathingPhaseScale={{
				phase: step.phase.id,
				seconds: step.phase.seconds,
				running: status === 'running'
			}}
			aria-hidden="true"
		>
			{#if status === 'completed'}
				<Check class="size-12" />
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

	<div class="flex min-h-8 items-center">
		{#if status === 'idle' && interactive}
			<label class="flex cursor-pointer items-center gap-3 text-sm font-medium">
				<Checkbox bind:checked={includeHold} />
				Include breath hold
			</label>
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
