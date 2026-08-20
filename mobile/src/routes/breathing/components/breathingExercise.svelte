<script lang="ts">
	import { Check, Play, Square } from '@lucide/svelte';
	import { onDestroy, onMount, untrack } from 'svelte';
	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import CircularProgress from '$lib/components/circularProgress.svelte';
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

	type TimerStatus = 'idle' | 'running' | 'completed';
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

	const durationSeconds = $derived(breathingDurationSeconds(includeHold));
	const durationMilliseconds = $derived(durationSeconds * 1000);
	const step = $derived(breathingStep(elapsedMilliseconds, includeHold));
	const remainingSeconds = $derived(
		Math.max(0, durationSeconds - Math.floor(elapsedMilliseconds / 1000))
	);

	$effect(() => resetForDate(localDate, complete));
	$effect(() => {
		if (preferenceLoaded) localStorage.setItem(HOLD_PREFERENCE_KEY, String(includeHold));
	});
	onMount(loadHoldPreference);
	onDestroy(clearTimer);

	function loadHoldPreference() {
		includeHold = localStorage.getItem(HOLD_PREFERENCE_KEY) !== 'false';
		preferenceLoaded = true;
	}

	function resetForDate(nextDate: string, isComplete: boolean) {
		if (loadedDate === nextDate && loadedComplete === isComplete) return;
		clearTimer();
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
		elapsedMilliseconds = 0;
		startedAt = 0;
		status = 'idle';
	}

	function clearTimer() {
		if (timerId) window.clearInterval(timerId);
		timerId = undefined;
	}
</script>

{#snippet actions()}
	{#if status === 'idle' && interactive}
		<Button
			size="lg"
			class="w-full text-white"
			style={`background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`}
			onclick={startExercise}
		>
			<Play class="mr-2 size-4 fill-current" /> Start breathing
		</Button>
	{:else if status === 'running'}
		<Button size="lg" variant="ghost" class="w-full" onclick={stopExercise}>
			<Square class="mr-2 size-4" /> Stop breathing
		</Button>
	{:else if saveState === 'error'}
		<Button size="lg" class="w-full" onclick={onretry}>Save breathing</Button>
	{/if}
{/snippet}

<section class="flex flex-col items-center gap-5 py-4" aria-label="Breathing timer">
	<div class="h-7" aria-live="polite">
		{#if status !== 'completed'}
			<p class="text-lg font-medium" style={`color: ${colors.primary}`}>{step.phase.label}</p>
		{/if}
	</div>

	<CircularProgress
		value={status === 'completed' ? durationMilliseconds : elapsedMilliseconds}
		max={durationMilliseconds}
		label="Breathing exercise progress"
		{colors}
	>
		{#if status === 'completed'}
			<Check class="size-9" />
		{:else}
			<p class="text-5xl font-semibold tracking-[-0.06em] tabular-nums">
				{formatTimer(remainingSeconds)}
			</p>
		{/if}
	</CircularProgress>

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

{#if (status === 'idle' && interactive) || status === 'running' || saveState === 'error'}
	<BottomActionBar>
		{@render actions()}
	</BottomActionBar>
{/if}
