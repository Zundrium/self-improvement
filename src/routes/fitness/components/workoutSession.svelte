<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { Clock3, Gauge, Pause, Play, SkipForward, X } from '@lucide/svelte';
	import type { AudioManager } from '$lib/audio/audio-manager';
	import { apiRequest } from '$lib/api';

	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Slider } from '$lib/components/ui/slider';
	import type { RepWorkoutActivity, Workout, WorkoutActivity } from '../fitness';

	interface Props {
		workout: Workout;
		audioManager: AudioManager;
		setCount: number;
		oncomplete: () => void | Promise<void>;
		oncancel: () => void;
		onspeedchange: (exerciseId: number, speedPercent: number) => void;
	}
	interface WakeLockSentinelLike {
		release(): Promise<void>;
		addEventListener(type: 'release', listener: () => void): void;
	}
	type Phase = 'intro' | 'exercise' | 'rest' | 'complete';

	let { workout, audioManager, setCount, oncomplete, oncancel, onspeedchange }: Props = $props();
	let phase = $state<Phase>('intro');
	let currentSet = $state(1);
	let currentActivityIndex = $state(0);
	let timeLeftMs = $state(0);
	let totalTimeMs = $state(1);
	let isPaused = $state(false);
	let activitySpeeds = $state(
		untrack(
			() =>
				Object.fromEntries(
					workout.activities.flatMap((activity) =>
						activity.type === 'reps' ? [[activity.exerciseId, activity.speedPercent] as const] : []
					)
				) as Record<number, number>
		)
	);
	let lastTick = 0;
	let lastWholeSecond = 0;
	let lastRemainingRep = 0;
	let timer: ReturnType<typeof setInterval> | undefined;
	let voiceTimeout: ReturnType<typeof setTimeout> | undefined;
	let wakeLock: WakeLockSentinelLike | null = null;

	const currentActivity = $derived(workout.activities[currentActivityIndex]);
	const nextActivity = $derived(
		currentActivityIndex === workout.activities.length - 1
			? workout.activities[0]
			: workout.activities[currentActivityIndex + 1]
	);
	const displayActivity = $derived(phase === 'rest' ? nextActivity : currentActivity);
	const speedTarget = $derived(phase === 'rest' ? nextActivity : currentActivity);
	const targetSpeed = $derived(
		speedTarget.type === 'reps'
			? (activitySpeeds[speedTarget.exerciseId] ?? speedTarget.speedPercent)
			: null
	);
	const progress = $derived(
		Math.max(0, Math.min(100, ((totalTimeMs - timeLeftMs) / totalTimeMs) * 100))
	);
	const isRunning = $derived(phase === 'intro' || phase === 'exercise' || phase === 'rest');
	const remainingReps = $derived(
		phase === 'exercise' && currentActivity.type === 'reps'
			? Math.max(0, Math.ceil(timeLeftMs / millisecondsPerRep(currentActivity)))
			: 0
	);

	const SOUNDS = {
		tick: '/fitness/audio/second_tick.m4a',
		start: '/fitness/audio/activity_start_ping.m4a',
		complete: '/fitness/audio/complete.m4a',
		intro: '/fitness/audio/intro.m4a',
		beep: '/fitness/audio/beep.m4a',
		missionComplete: '/fitness/audio/voice/heart/mission-completed.m4a',
		nextActivity: '/fitness/audio/voice/heart/next-activity-is.m4a'
	};

	onMount(() => {
		const voiceUrls = workout.activities.map(activityVoiceUrl);
		void audioManager
			.preload([...Object.values(SOUNDS), ...voiceUrls])
			.catch((error) => console.error('Workout audio preload failed:', error));
		timer = setInterval(tick, 100);
		startIntro();
		void requestWakeLock();
		document.addEventListener('visibilitychange', handleVisibilityChange);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
		if (voiceTimeout) clearTimeout(voiceTimeout);
		void wakeLock?.release().catch((error) => console.error('Wake lock release failed:', error));
		audioManager.stopAll();
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	});

	function tick() {
		const now = performance.now();
		const elapsed = now - lastTick;
		lastTick = now;
		if (!isRunning || isPaused) return;

		timeLeftMs = Math.max(0, timeLeftMs - elapsed);
		const wholeSecond = Math.ceil(timeLeftMs / 1000);
		if (wholeSecond !== lastWholeSecond) {
			lastWholeSecond = wholeSecond;
			handleCountdownSound(wholeSecond);
		}
		if (timeLeftMs === 0) advance();
	}

	function handleCountdownSound(wholeSecond: number) {
		if (wholeSecond <= 0 || phase === 'intro') return;

		if (phase === 'exercise' && currentActivity.type === 'reps') {
			const remaining = Math.ceil(timeLeftMs / millisecondsPerRep(currentActivity));
			if (remaining < lastRemainingRep) {
				lastRemainingRep = remaining;
				void audioManager.play(SOUNDS.beep);
				playNumber(remaining);
			}
			return;
		}

		if (wholeSecond % 10 === 0 || wholeSecond <= 3) void audioManager.play(SOUNDS.tick);
		if (phase === 'exercise' && (wholeSecond % 5 === 0 || wholeSecond <= 3)) {
			playNumber(wholeSecond);
		}
	}

	function beginCountdown(durationMs: number) {
		totalTimeMs = Math.max(1, durationMs);
		timeLeftMs = Math.max(0, durationMs);
		lastWholeSecond = Math.ceil(durationMs / 1000);
		lastTick = performance.now();
		if (durationMs <= 0) setTimeout(advance, 0);
	}

	function startIntro() {
		phase = 'intro';
		isPaused = false;
		beginCountdown(10_000);
		void audioManager.play(SOUNDS.intro);
		voiceTimeout = setTimeout(() => {
			if (phase === 'intro') void announceActivity(currentActivity);
		}, 2500);
	}

	function startExercise() {
		phase = 'exercise';
		isPaused = false;
		lastRemainingRep = currentActivity.type === 'reps' ? currentActivity.amount : 0;
		beginCountdown(activityDurationMs(currentActivity));
		void audioManager.play(SOUNDS.start);
	}

	function startRest() {
		phase = 'rest';
		isPaused = false;
		const betweenSets = currentActivityIndex === workout.activities.length - 1;
		const restSeconds = betweenSets ? workout.restBetweenSets : workout.restBetweenExercises;
		beginCountdown(restSeconds * 1000);
		void announceActivity(nextActivity);
	}

	function advance() {
		if (phase === 'intro') {
			startExercise();
			return;
		}
		if (phase === 'exercise') {
			if (currentActivityIndex === workout.activities.length - 1 && currentSet === setCount) {
				void finishWorkout();
			} else {
				startRest();
			}
			return;
		}
		if (phase === 'rest') {
			if (currentActivityIndex === workout.activities.length - 1) {
				currentSet += 1;
				currentActivityIndex = 0;
			} else {
				currentActivityIndex += 1;
			}
			startExercise();
		}
	}

	async function finishWorkout() {
		phase = 'complete';
		await audioManager.play(SOUNDS.complete);
		await audioManager.play(SOUNDS.missionComplete);
		await oncomplete();
	}

	async function announceActivity(activity: WorkoutActivity) {
		await audioManager.play(SOUNDS.nextActivity);
		await audioManager.play(activityVoiceUrl(activity));
	}

	function activityVoiceUrl(activity: WorkoutActivity): string {
		return activity.imageUrl
			.replace('/fitness/activities/', '/fitness/audio/voice/heart/')
			.replace(/\.webp$/, '.m4a');
	}

	function playNumber(value: number) {
		if (value > 0 && value <= 50) {
			void audioManager.play(`/fitness/audio/voice/heart/${value}.m4a`);
		}
	}

	function speedFor(activity: RepWorkoutActivity): number {
		return activitySpeeds[activity.exerciseId] ?? activity.speedPercent;
	}

	function millisecondsPerRep(activity: RepWorkoutActivity): number {
		return 2000 / (speedFor(activity) / 100);
	}

	function activityDurationMs(activity: WorkoutActivity): number {
		return activity.type === 'reps'
			? activityDurationAtSpeed(activity, speedFor(activity))
			: activity.amount * 1000;
	}

	function activityDurationAtSpeed(activity: RepWorkoutActivity, speedPercent: number): number {
		return ((activity.amount * 2) / (speedPercent / 100)) * 1000;
	}

	function handleSpeedChange(value: number) {
		const target = speedTarget;
		if (target.type !== 'reps') return;
		const speedPercent = Math.max(50, Math.min(150, Math.round(value / 5) * 5));
		const remainingFraction = totalTimeMs > 0 ? timeLeftMs / totalTimeMs : 1;

		activitySpeeds = { ...activitySpeeds, [target.exerciseId]: speedPercent };
		onspeedchange(target.exerciseId, speedPercent);

		if (
			phase === 'exercise' &&
			currentActivity.type === 'reps' &&
			target.exerciseId === currentActivity.exerciseId
		) {
			const newTotalTime = activityDurationAtSpeed(currentActivity, speedPercent);
			totalTimeMs = newTotalTime;
			timeLeftMs = newTotalTime * remainingFraction;
			lastWholeSecond = Math.ceil(timeLeftMs / 1000);
			lastRemainingRep = Math.ceil(timeLeftMs / millisecondsPerRep(currentActivity));
			lastTick = performance.now();
		}
	}

	async function saveSpeed(value: number) {
		const target = speedTarget;
		if (target.type !== 'reps') return;
		const speedPercent = Math.max(50, Math.min(150, Math.round(value / 5) * 5));

		try {
			await apiRequest(`/api/app/fitness/exercises/${target.exerciseId}/speed`, {
				method: 'PUT',
				body: JSON.stringify({ speedPercent })
			});
		} catch (error) {
			console.error('Exercise speed save failed:', error);
		}
	}

	function formatTime(milliseconds: number): string {
		const seconds = Math.ceil(milliseconds / 1000);
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	}

	function togglePause() {
		isPaused = !isPaused;
		lastTick = performance.now();
	}

	function skip() {
		audioManager.stopAll();
		advance();
	}

	function close() {
		audioManager.stopAll();
		oncancel();
	}

	async function requestWakeLock() {
		try {
			const navigatorWithWakeLock = navigator as Navigator & {
				wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
			};
			wakeLock = (await navigatorWithWakeLock.wakeLock?.request('screen')) ?? null;
			wakeLock?.addEventListener('release', () => (wakeLock = null));
		} catch (error) {
			console.error('Wake lock failed:', error);
		}
	}

	function handleVisibilityChange() {
		if (document.visibilityState === 'visible' && !wakeLock) void requestWakeLock();
	}
</script>

{#snippet speedControl()}
	{#if speedTarget.type === 'reps' && targetSpeed !== null}
		<div class="flex items-center gap-3 py-1">
			<span class="shrink-0 text-sm font-medium">Speed</span>
			<span class="shrink-0 text-sm text-(--text)/56 tabular-nums">{targetSpeed}%</span>
			<div class="min-w-0 flex-1">
				<Slider
					type="single"
					value={targetSpeed}
					min={50}
					max={150}
					step={5}
					onValueChange={handleSpeedChange}
					onValueCommit={saveSpeed}
					aria-label={`${speedTarget.name} speed`}
				/>
			</div>
		</div>
	{/if}
{/snippet}

<section class="flex min-h-0 flex-1 flex-col gap-3" aria-label="Active workout">
	<div class="flex shrink-0 items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2 overflow-hidden">
			<Badge class={phase === 'exercise' ? 'bg-(--text) text-(--bg)' : ''}
				>{phase === 'intro' ? 'Get ready' : phase === 'rest' ? 'Rest' : 'Exercise'}</Badge
			>
			<span class="text-xs whitespace-nowrap text-(--text)/48 tabular-nums">
				Exercise {currentActivityIndex + 1} / {workout.activities.length}
			</span>
			<span class="text-xs whitespace-nowrap text-(--text)/48 tabular-nums">
				Set {currentSet} / {setCount}
			</span>
		</div>
		<Button variant="ghost" size="icon" onclick={close} aria-label="Close workout"
			><X class="size-5" /></Button
		>
	</div>

	<div class="shrink-0">
		{#if phase === 'rest' || phase === 'intro'}
			<p class="text-xs font-medium text-(--text)/40">UP NEXT</p>
			<h2 class="mt-0.5 text-2xl font-medium tracking-[-0.04em]">
				{phase === 'intro' ? currentActivity.name : nextActivity.name}
			</h2>
		{:else}
			<h2 class="text-2xl font-medium tracking-[-0.04em]">{currentActivity.name}</h2>
			{#if currentActivity.type === 'reps'}
				<p class="mt-1 flex items-center gap-2 text-sm text-(--text)/56">
					<Gauge class="size-4" />
					{speedFor(currentActivity)}% cadence · {currentActivity.amount} reps
				</p>
			{:else}
				<p class="mt-1 flex items-center gap-2 text-sm text-(--text)/56">
					<Clock3 class="size-4" />
					{currentActivity.amount} second interval
				</p>
			{/if}
		{/if}
	</div>

	<div class="min-h-0 flex-1 overflow-hidden">
		<img
			src={displayActivity.imageUrl}
			alt={displayActivity.name}
			class="size-full object-contain"
		/>
	</div>

	<div class="shrink-0 space-y-3">
		{@render speedControl()}

		<div class="text-center">
			<div class="text-5xl font-medium tracking-[-0.08em] tabular-nums sm:text-7xl">
				{formatTime(timeLeftMs)}
			</div>
			{#if phase === 'exercise' && currentActivity.type === 'reps'}<p
					class="mt-1 text-sm text-(--text)/56"
				>
					{remainingReps} reps remaining
				</p>{/if}
			{#if isPaused}<p class="mt-1 text-sm font-medium">Paused</p>{/if}
		</div>
		<Progress value={progress} />
		<div class="grid grid-cols-[1fr_auto] gap-3">
			<Button size="lg" onclick={togglePause}
				>{#if isPaused}<Play class="mr-2 size-4 fill-current" /> Resume{:else}<Pause
						class="mr-2 size-4 fill-current"
					/> Pause{/if}</Button
			>
			<Button
				variant="ghost"
				size="icon"
				class="size-11"
				onclick={skip}
				aria-label="Skip current step"><SkipForward class="size-4" /></Button
			>
		</div>
	</div>
</section>
