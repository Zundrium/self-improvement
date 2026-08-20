<script lang="ts">
	import { Check, LoaderCircle, Play, Square } from '@lucide/svelte';
	import { onDestroy } from 'svelte';
	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		BREATHING_DURATION_SECONDS,
		BREATHING_ROUNDS,
		breathingStep,
		formatTimer,
		type BreathingCompletion,
		type SaveState
	} from '../breathing';

	type TimerStatus = 'idle' | 'running' | 'completed';
	type Props = {
		localDate: string;
		saveState: SaveState;
		oncomplete: (completion: BreathingCompletion) => void;
		onretry: () => void;
	};

	let { localDate, saveState, oncomplete, onretry }: Props = $props();
	let status = $state<TimerStatus>('idle');
	let elapsedMilliseconds = $state(0);
	let startedAt = 0;
	let timerId: number | undefined;

	const step = $derived(breathingStep(elapsedMilliseconds));
	const circlePhase = $derived(status === 'running' ? step.phase.id : 'idle');
	const remainingSeconds = $derived(
		Math.max(0, BREATHING_DURATION_SECONDS - Math.floor(elapsedMilliseconds / 1000))
	);

	onDestroy(clearTimer);

	function startExercise() {
		startedAt = Date.now();
		elapsedMilliseconds = 0;
		status = 'running';
		timerId = window.setInterval(updateTimer, 100);
	}

	function updateTimer() {
		elapsedMilliseconds = Date.now() - startedAt;
		if (elapsedMilliseconds >= BREATHING_DURATION_SECONDS * 1000) completeExercise();
	}

	function completeExercise() {
		clearTimer();
		elapsedMilliseconds = BREATHING_DURATION_SECONDS * 1000;
		status = 'completed';
		oncomplete({ localDate, startedAt });
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
	{#if status === 'idle'}
		<Button size="lg" class="w-full" onclick={startExercise}>
			<Play class="mr-2 size-4 fill-current" /> Start 4-7-8 breathing
		</Button>
	{:else if status === 'running'}
		<Button size="lg" variant="ghost" class="w-full" onclick={stopExercise}>
			<Square class="mr-2 size-4" /> Stop exercise
		</Button>
	{:else if saveState === 'error'}
		<Button size="lg" class="w-full" onclick={onretry}>Save completion</Button>
	{/if}
{/snippet}

<section class="space-y-6 pt-2" aria-label="4-7-8 breathing exercise">
	<header class="space-y-2 text-center">
		<p class="text-xs font-medium tracking-[0.16em] text-(--text)/48 uppercase">Daily exercise</p>
		<h1 class="text-2xl font-semibold tracking-[-0.04em]">4-7-8 breathing</h1>
		<p class="mx-auto max-w-sm text-sm leading-6 text-(--text)/56">
			Breathe in for 4, hold for 7, then breathe out for 8. Six rounds take just under two minutes.
		</p>
	</header>

	<div class="flex flex-col items-center gap-5">
		<div class="relative size-64" aria-hidden="true">
			<div class="breathing-circle absolute inset-0 rounded-full" data-phase={circlePhase}></div>
			<div class="absolute inset-0 flex flex-col items-center justify-center text-center">
				{#if status === 'running'}
					<p class="text-2xl font-semibold tracking-[-0.04em]">{step.phase.label}</p>
					<p class="mt-1 text-5xl font-semibold tabular-nums">{step.remainingSeconds}</p>
					<p class="mt-2 text-xs text-(--text)/48">{step.phase.instruction}</p>
				{:else if status === 'completed'}
					<Check class="size-8" />
					<p class="mt-2 font-medium">Complete</p>
				{:else}
					<p class="text-sm text-(--text)/48">Ready</p>
					<p class="mt-1 text-4xl font-semibold tracking-[-0.05em] tabular-nums">
						{formatTimer(BREATHING_DURATION_SECONDS)}
					</p>
				{/if}
			</div>
		</div>

		<div class="min-h-11 text-center" aria-live="polite">
			{#if status === 'running'}
				<p class="text-sm font-medium">Round {step.round} of {BREATHING_ROUNDS}</p>
				<p class="mt-1 text-xs text-(--text)/48 tabular-nums">
					{formatTimer(remainingSeconds)} remaining
				</p>
			{:else if saveState === 'saving'}
				<p class="inline-flex items-center gap-2 text-sm text-(--text)/56">
					<LoaderCircle class="size-4 animate-spin" /> Saving completion
				</p>
			{:else if saveState === 'error'}
				<p class="text-destructive text-sm">Your exercise is complete, but could not be saved.</p>
			{:else if status === 'idle'}
				<p class="text-sm text-(--text)/56">Exhale fully, then press start.</p>
			{/if}
		</div>
	</div>

	<div class="hidden sm:block">
		{@render actions()}
	</div>

	<div class="border-t border-(--text)/8 pt-5 text-sm leading-6 text-(--text)/56">
		<p>
			Sit upright. Rest the tip of your tongue just behind your upper front teeth, and keep it there
			throughout the exercise. Stop if you feel uncomfortable or lightheaded.
		</p>
	</div>
</section>

{#if status !== 'completed' || saveState === 'error'}
	<BottomActionBar>
		{@render actions()}
	</BottomActionBar>
{/if}

<style>
	.breathing-circle {
		border: 1px solid color-mix(in oklab, var(--text) 14%, transparent);
		background: color-mix(in oklab, var(--text) 8%, transparent);
		box-shadow: inset 0 0 4rem color-mix(in oklab, var(--text) 5%, transparent);
		transform: scale(0.62);
		transition-property: transform;
		transition-timing-function: linear;
	}

	.breathing-circle[data-phase='inhale'] {
		transform: scale(1);
		transition-duration: 4s;
	}

	.breathing-circle[data-phase='hold'] {
		transform: scale(1);
		transition-duration: 0s;
	}

	.breathing-circle[data-phase='exhale'] {
		transform: scale(0.62);
		transition-duration: 8s;
	}

	@media (prefers-reduced-motion: reduce) {
		.breathing-circle {
			transition: none;
		}
	}
</style>
