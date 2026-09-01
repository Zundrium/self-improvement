<script lang="ts">
import { Info, Pause, Play, SkipForward, X } from '@lucide/svelte';
import { onDestroy, onMount, untrack } from 'svelte';
import type { AudioManager } from '$lib/audio/audio-manager';
import {
	BottomActionBar,
	BottomActionButton,
	BottomActionGroup
} from '$lib/components/ui/bottom-action-bar';
import { Button } from '$lib/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
import { Progress } from '$lib/components/ui/progress';
import { Slider } from '$lib/components/ui/slider';
import {
	activityDurationMs,
	activityRepeatCount,
	type CadencedRepGuidedRoutineActivity,
	completeGuidedRoutine,
	type GuidedRoutineActivity,
	type GuidedRoutinePosition,
	initialRoutinePosition,
	nextCountdownUpdateDelay,
	nextRoutinePosition,
	repDurationMs,
	shouldPlayRestCountdownTick
} from './guidedRoutine';

interface Props {
	activities: GuidedRoutineActivity[];
	audioManager: AudioManager;
	setCount: number;
	restBetweenActivitiesSeconds: number;
	restBetweenSetsSeconds: number;
	restCountdownSeconds?: number;
	restCountdownSound?: string;
	restPeriodicTickSeconds?: number;
	sounds: GuidedRoutineSounds;
	activityLabel?: string;
	oncomplete: () => void | Promise<void>;
	oncancel: () => void;
	oncadencechange?: (activity: CadencedRepGuidedRoutineActivity, cadencePercent: number) => void;
	oncadencecommit?: (activity: CadencedRepGuidedRoutineActivity, cadencePercent: number) => void;
	onimagevariantcommit?: (activity: GuidedRoutineActivity, variantId: string) => void;
}

export interface GuidedRoutineSounds {
	tick: string;
	start: string;
	complete: string;
	intro: string;
	beep: string;
	missionComplete?: string;
	nextActivity?: string;
	number?: (value: number) => string;
}

interface WakeLockSentinelLike {
	release(): Promise<void>;
	addEventListener(type: 'release', listener: () => void): void;
}

type Phase = 'intro' | 'activity' | 'rest' | 'complete';

let {
	activities,
	audioManager,
	setCount,
	restBetweenActivitiesSeconds,
	restBetweenSetsSeconds,
	restCountdownSeconds = 3,
	sounds,
	restCountdownSound = sounds.tick,
	restPeriodicTickSeconds = 10,
	activityLabel = 'Activity',
	oncomplete,
	oncancel,
	oncadencechange,
	oncadencecommit,
	onimagevariantcommit
}: Props = $props();
let phase = $state<Phase>('intro');
let position = $state<GuidedRoutinePosition>(initialRoutinePosition());
let timeLeftMs = $state(0);
let totalTimeMs = $state(1);
let isPaused = $state(false);
let activityCadences = $state(
	untrack(() =>
		Object.fromEntries(
			activities.flatMap((activity) =>
				activity.type === 'cadenced-reps'
					? [[cadenceKey(activity), activity.cadencePercent] as const]
					: []
			)
		)
	)
);
let activityImageVariants = $state(
	untrack(() =>
		Object.fromEntries(
			activities.flatMap((activity) =>
				activity.selectedImageVariantId
					? [[String(activity.id), activity.selectedImageVariantId] as const]
					: []
			)
		)
	)
);
let lastTick = 0;
let lastWholeSecond = 0;
let lastRemainingRep = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let voiceTimeout: ReturnType<typeof setTimeout> | undefined;
let wakeLock: WakeLockSentinelLike | null = null;

const currentActivity = $derived(activities[position.activityIndex]);
const followingPosition = $derived(nextRoutinePosition(activities, setCount, position));
const followingActivity = $derived(
	followingPosition ? activities[followingPosition.activityIndex] : undefined
);
const displayActivity = $derived(phase === 'rest' ? followingActivity : currentActivity);
const displayPosition = $derived(
	phase === 'rest' && followingPosition ? followingPosition : position
);
const displaySide = $derived(
	displayActivity?.detail === 'Left side' || displayActivity?.detail === 'Right side'
		? displayActivity.detail
		: undefined
);
const selectedImageVariant = $derived(
	displayActivity?.imageVariants?.find(
		({ id }) => id === activityImageVariants[String(displayActivity.id)]
	)
);
const displayImageUrl = $derived(selectedImageVariant?.imageUrl ?? displayActivity?.imageUrl);
const cadenceTarget = $derived(
	(phase === 'rest' ? followingActivity : currentActivity)?.type === 'cadenced-reps'
		? ((phase === 'rest' ? followingActivity : currentActivity) as CadencedRepGuidedRoutineActivity)
		: undefined
);
const targetCadence = $derived(cadenceTarget ? cadenceFor(cadenceTarget) : null);
const progress = $derived(
	Math.max(0, Math.min(100, ((totalTimeMs - timeLeftMs) / totalTimeMs) * 100))
);
const remainingReps = $derived(
	phase === 'activity' && currentActivity?.type === 'cadenced-reps'
		? Math.max(0, Math.ceil(timeLeftMs / repDurationMs(cadenceFor(currentActivity))))
		: 0
);
const displayRep = $derived(
	displayActivity?.type === 'cadenced-reps'
		? phase === 'activity'
			? Math.min(displayActivity.reps, Math.max(1, displayActivity.reps - remainingReps + 1))
			: 1
		: 0
);
const isManualReps = $derived(phase === 'activity' && currentActivity?.type === 'manual-reps');
const displayActivitySetCount = $derived(
	displayActivity ? activityRepeatCount(displayActivity) : 1
);
const displaySetIndex = $derived(
	displayActivitySetCount > 1 ? displayPosition.activityRepeatIndex : displayPosition.setIndex
);
const displaySetCount = $derived(displayActivitySetCount > 1 ? displayActivitySetCount : setCount);

onMount(() => {
	const voiceUrls = activities.flatMap((activity) =>
		activity.voiceUrl ? [activity.voiceUrl] : []
	);
	const soundUrls = [
		sounds.tick,
		sounds.start,
		sounds.complete,
		sounds.intro,
		sounds.beep,
		sounds.missionComplete,
		sounds.nextActivity
	].filter((url): url is string => Boolean(url));
	void audioManager
		.preload([...soundUrls, ...voiceUrls])
		.catch((error) => console.error('Routine audio preload failed:', error));
	startIntro();
	void requestWakeLock();
	document.addEventListener('visibilitychange', handleVisibilityChange);
});

onDestroy(() => {
	if (timer) clearTimeout(timer);
	if (voiceTimeout) clearTimeout(voiceTimeout);
	void wakeLock?.release().catch((error) => console.error('Wake lock release failed:', error));
	if (phase !== 'complete') audioManager.stopAll();
	document.removeEventListener('visibilitychange', handleVisibilityChange);
});

function tick() {
	const now = performance.now();
	const elapsed = now - lastTick;
	lastTick = now;
	if (phase === 'complete' || isPaused || isManualReps) return;

	timeLeftMs = Math.max(0, timeLeftMs - elapsed);
	const wholeSecond = Math.ceil(timeLeftMs / 1000);
	if (wholeSecond !== lastWholeSecond) {
		lastWholeSecond = wholeSecond;
		if (currentActivity?.type !== 'cadenced-reps' || phase !== 'activity')
			handleCountdownSound(wholeSecond);
	}
	if (phase === 'activity' && currentActivity?.type === 'cadenced-reps') {
		const remaining = Math.ceil(timeLeftMs / repDurationMs(cadenceFor(currentActivity)));
		if (remaining < lastRemainingRep) {
			lastRemainingRep = remaining;
			void audioManager.play(sounds.beep);
			playNumber(remaining);
		}
	}
	if (timeLeftMs === 0) advance();
	else scheduleTick();
}

function scheduleTick() {
	if (timer) clearTimeout(timer);
	if (phase === 'complete' || isPaused || isManualReps) return;
	const repDuration =
		phase === 'activity' && currentActivity?.type === 'cadenced-reps'
			? repDurationMs(cadenceFor(currentActivity))
			: undefined;
	timer = setTimeout(tick, nextCountdownUpdateDelay(timeLeftMs, repDuration));
}

function handleCountdownSound(wholeSecond: number) {
	if (wholeSecond <= 0 || phase === 'intro') return;
	if (phase === 'rest') {
		if (shouldPlayRestCountdownTick(wholeSecond, restCountdownSeconds)) {
			void audioManager.play(restCountdownSound);
			return;
		}
		if (
			restPeriodicTickSeconds > 0 &&
			wholeSecond % Math.max(1, Math.floor(restPeriodicTickSeconds)) === 0
		)
			void audioManager.play(sounds.tick);
		return;
	}
	if (wholeSecond % 10 === 0 || wholeSecond <= 3) void audioManager.play(sounds.tick);
	if (phase === 'activity' && (wholeSecond % 5 === 0 || wholeSecond <= 3)) playNumber(wholeSecond);
}

function beginCountdown(durationMs: number) {
	totalTimeMs = Math.max(1, durationMs);
	timeLeftMs = Math.max(0, durationMs);
	lastWholeSecond = Math.ceil(durationMs / 1000);
	lastTick = performance.now();
	if (durationMs <= 0) setTimeout(advance, 0);
	else scheduleTick();
}

function startIntro() {
	phase = 'intro';
	isPaused = false;
	beginCountdown(10_000);
	void audioManager.play(sounds.intro);
	voiceTimeout = setTimeout(() => {
		if (phase === 'intro' && currentActivity) void announceActivity(currentActivity);
	}, 2500);
}

function startActivity() {
	if (!currentActivity) return;
	phase = 'activity';
	isPaused = false;
	lastRemainingRep = currentActivity.type === 'cadenced-reps' ? currentActivity.reps : 0;
	const durationMs = activityDurationMs(
		currentActivity,
		currentActivity.type === 'cadenced-reps' ? cadenceFor(currentActivity) : undefined
	);
	if (durationMs === null) {
		totalTimeMs = 1;
		timeLeftMs = 0;
		lastTick = performance.now();
		if (timer) clearTimeout(timer);
	} else {
		beginCountdown(durationMs);
	}
	void audioManager.play(sounds.start);
}

function startRest() {
	if (!followingActivity) return;
	phase = 'rest';
	isPaused = false;
	const betweenSets = followingPosition?.setIndex !== position.setIndex;
	const restSeconds = betweenSets ? restBetweenSetsSeconds : restBetweenActivitiesSeconds;
	beginCountdown(restSeconds * 1000);
	void announceActivity(followingActivity);
}

function advance() {
	if (phase === 'intro') return startActivity();
	if (phase === 'activity') return advanceActivity();
	if (phase === 'rest') return advanceAfterRest();
}

function advanceActivity() {
	if (!followingPosition) return void finishRoutine();
	startRest();
}

function advanceAfterRest() {
	if (!followingPosition) return;
	position = followingPosition;
	startActivity();
}

async function finishRoutine() {
	phase = 'complete';
	await completeGuidedRoutine(playCompletionSounds, oncomplete);
}

async function playCompletionSounds() {
	await audioManager.play(sounds.complete);
	if (sounds.missionComplete) await audioManager.play(sounds.missionComplete);
}

async function announceActivity(activity: GuidedRoutineActivity) {
	if (!activity.voiceUrl) return;
	if (sounds.nextActivity) await audioManager.play(sounds.nextActivity);
	await audioManager.play(activity.voiceUrl);
}

function playNumber(value: number) {
	if (value > 0 && value <= 50 && sounds.number) void audioManager.play(sounds.number(value));
}

function cadenceFor(activity: CadencedRepGuidedRoutineActivity): number {
	return activityCadences[cadenceKey(activity)] ?? activity.cadencePercent;
}

function cadenceKey(activity: CadencedRepGuidedRoutineActivity): string {
	return String(activity.cadenceKey ?? activity.id);
}

function handleCadenceChange(value: number) {
	if (!cadenceTarget) return;
	const cadencePercent = Math.max(50, Math.min(150, Math.round(value / 5) * 5));
	const remainingFraction = totalTimeMs > 0 ? timeLeftMs / totalTimeMs : 1;
	activityCadences = { ...activityCadences, [cadenceKey(cadenceTarget)]: cadencePercent };
	oncadencechange?.(cadenceTarget, cadencePercent);

	if (phase === 'activity' && currentActivity?.id === cadenceTarget.id) {
		const newTotalTime = activityDurationMs(cadenceTarget, cadencePercent) ?? 1;
		totalTimeMs = newTotalTime;
		timeLeftMs = newTotalTime * remainingFraction;
		lastWholeSecond = Math.ceil(timeLeftMs / 1000);
		lastRemainingRep = Math.ceil(timeLeftMs / repDurationMs(cadencePercent));
		lastTick = performance.now();
		scheduleTick();
	}
}

function commitCadence(value: number) {
	if (!cadenceTarget) return;
	oncadencecommit?.(cadenceTarget, Math.max(50, Math.min(150, Math.round(value / 5) * 5)));
}

function selectImageVariant(activity: GuidedRoutineActivity, variantId: string) {
	activityImageVariants = { ...activityImageVariants, [String(activity.id)]: variantId };
	onimagevariantcommit?.(activity, variantId);
}

function completeManualActivity() {
	if (currentActivity?.type === 'manual-reps') advance();
}

function formatTime(milliseconds: number): string {
	const seconds = Math.ceil(milliseconds / 1000);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function togglePause() {
	isPaused = !isPaused;
	lastTick = performance.now();
	if (isPaused) {
		if (timer) clearTimeout(timer);
	} else scheduleTick();
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

{#snippet cadenceControl()}
	{#if cadenceTarget && targetCadence !== null}
		<div class="flex items-center gap-3 py-1">
			<span class="shrink-0 text-sm font-medium">Speed</span>
			<span class="shrink-0 text-sm text-(--text)/56 tabular-nums">{targetCadence}%</span>
			<div class="min-w-0 flex-1">
				<Slider
					type="single"
					value={targetCadence}
					min={50}
					max={150}
					step={5}
					onValueChange={handleCadenceChange}
					onValueCommit={commitCadence}
					aria-label={`${cadenceTarget.name} speed`}
				/>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet activityTitle(activity: GuidedRoutineActivity)}
	<div class="relative flex items-center justify-center">
		<h2 class="min-w-0 px-10 text-center text-2xl font-medium tracking-[-0.04em]">{activity.name}</h2>
		{#if activity.instruction}
			<Popover>
				<PopoverTrigger>
					{#snippet child({ props })}
						<Button
							variant="ghost"
							size="small" format="icon"
							class="absolute right-0"
							aria-label={`How to do ${activity.name}`}
							{...props}
						>
							<Info class="size-4" />
						</Button>
					{/snippet}
				</PopoverTrigger>
				<PopoverContent align="end" class="w-[min(20rem,calc(100vw-2rem))] text-center">
					<p class="text-sm font-medium">How to do {activity.name}</p>
					<p class="mt-2 text-sm leading-6 text-(--text)/64">{activity.instruction}</p>
				</PopoverContent>
			</Popover>
		{/if}
	</div>
{/snippet}

{#snippet sessionControls(activity: GuidedRoutineActivity)}
	<BottomActionGroup>
		<BottomActionButton
			format="icon"
			onclick={close}
			aria-label={`Close ${activityLabel.toLowerCase()}`}
		>
			<X class="size-5" />
		</BottomActionButton>
		{#if isManualReps && activity.type === 'manual-reps'}
			<BottomActionButton tone="primary" onclick={completeManualActivity}>
				Finish {activity.reps} reps
			</BottomActionButton>
		{:else}
			<BottomActionButton tone="primary" onclick={togglePause}>
				{#if isPaused}
					<Play class="mr-2 size-4 fill-current" /> Resume
				{:else}
					<Pause class="mr-2 size-4 fill-current" /> Pause
				{/if}
			</BottomActionButton>
		{/if}
		<BottomActionButton format="icon" onclick={skip} aria-label="Skip current step">
			<SkipForward class="size-4" />
		</BottomActionButton>
	</BottomActionGroup>
{/snippet}

{#if currentActivity && displayActivity}
	<section
		class="flex min-h-0 flex-1 flex-col justify-center-safe gap-4"
		aria-label={`Active ${activityLabel.toLowerCase()}`}
	>
		<div class="shrink-0 text-center">
			{#if phase === 'intro'}
				{@render activityTitle(currentActivity)}
			{:else if phase === 'rest'}
				<p class="text-xs font-medium text-(--text)/40">UP NEXT</p>
				<div class="mt-0.5">{@render activityTitle(displayActivity)}</div>
				{#if displayActivity.detail && !displaySide}
					<p class="mt-1 text-sm text-(--text)/56">{displayActivity.detail}</p>
				{/if}
			{:else}
				{@render activityTitle(currentActivity)}
			{/if}
		</div>

		<div class="min-h-40 flex-1 overflow-hidden">
			<img src={displayImageUrl} alt={displayActivity.name} class="size-full object-contain" />
		</div>

		<div
			class={`grid shrink-0 gap-2 text-center text-sm font-medium tabular-nums ${displayActivity.type === 'cadenced-reps' || displaySide ? 'grid-cols-3' : 'grid-cols-2'}`}
		>
			<div class="rounded-2xl px-3 py-2 text-blue-700 dark:text-blue-300">
				{activityLabel} {displayPosition.activityIndex + 1} / {activities.length}
			</div>
			<div class="rounded-2xl px-3 py-2 text-violet-700 dark:text-violet-300">
				Set {displaySetIndex + 1} / {displaySetCount}
			</div>
			{#if displayActivity.type === 'cadenced-reps'}
				<div class="rounded-2xl px-3 py-2 text-emerald-700 dark:text-emerald-300">
					Rep {displayRep} / {displayActivity.reps}
				</div>
			{:else if displaySide}
				<div class="rounded-2xl px-3 py-2 text-emerald-700 dark:text-emerald-300">
					{displaySide}
				</div>
			{/if}
		</div>

		<div class="shrink-0 space-y-4">
			<div class="text-center">
				{#if isManualReps && currentActivity.type === 'manual-reps'}
					<div class="text-5xl font-medium tracking-[-0.08em] tabular-nums sm:text-7xl">
						{currentActivity.reps}
					</div>
					<p class="mt-1 text-sm text-(--text)/56">slow reps</p>
				{:else}
					<div class="text-5xl font-medium tracking-[-0.08em] tabular-nums sm:text-7xl">
						{formatTime(timeLeftMs)}
					</div>
				{/if}
			</div>
			<Progress class="h-3" value={isManualReps ? 0 : progress} animated={false} />
			{@render cadenceControl()}
			{#if displayActivity.imageVariants?.length}
				<div class="grid shrink-0 grid-cols-3 gap-2" aria-label={`${displayActivity.name} level`}>
					{#each displayActivity.imageVariants as variant (variant.id)}
						<Button
							variant={selectedImageVariant?.id === variant.id ? 'default' : 'ghost'}
							size="small"
							onclick={() => selectImageVariant(displayActivity, variant.id)}
							aria-pressed={selectedImageVariant?.id === variant.id}>{variant.label}</Button
						>
					{/each}
				</div>
			{/if}
			<div class="hidden sm:block">{@render sessionControls(currentActivity)}</div>
		</div>
	</section>

	<BottomActionBar>{@render sessionControls(currentActivity)}</BottomActionBar>
{/if}
