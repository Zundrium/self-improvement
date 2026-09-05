import type { AudioManager } from '$lib/audio/audio-manager';
import { consumeRoutineTick } from '$lib/routines/engine';
import { clearPausedSession, loadPausedSession, savePausedSession } from '$lib/routines/session';
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
} from '$lib/routines/model';

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

export interface RoutineControllerConfig {
	activities: GuidedRoutineActivity[];
	audioManager: AudioManager;
	setCount: number;
	restBetweenActivitiesSeconds: number;
	restBetweenSetsSeconds: number;
	restCountdownSeconds: number;
	restCountdownSound: string;
	restPeriodicTickSeconds: number;
	sounds: GuidedRoutineSounds;
	oncomplete: () => void | Promise<void>;
	oncancel: () => void;
	oncadencechange?: (activity: CadencedRepGuidedRoutineActivity, cadencePercent: number) => void;
	oncadencecommit?: (activity: CadencedRepGuidedRoutineActivity, cadencePercent: number) => void;
	onimagevariantcommit?: (activity: GuidedRoutineActivity, variantId: string) => void;
	sessionIdentity?: string;
}

type Phase = 'intro' | 'activity' | 'rest' | 'complete';
interface WakeLockSentinelLike {
	release(): Promise<void>;
	addEventListener(type: 'release', listener: () => void): void;
}
type RoutineSnapshot = {
	phase: Exclude<Phase, 'complete'>;
	position: GuidedRoutinePosition;
	timeLeftMs: number;
	totalTimeMs: number;
	activityCadences: Record<string, number>;
	activityImageVariants: Record<string, string>;
};

export function createRoutineController(getConfig: () => RoutineControllerConfig) {
	const initial = getConfig();
	let phase = $state<Phase>('intro');
	let position = $state<GuidedRoutinePosition>(initialRoutinePosition());
	let timeLeftMs = $state(0);
	let totalTimeMs = $state(1);
	let isPaused = $state(false);
	let activityCadences = $state(cadencesFor(initial.activities));
	let activityImageVariants = $state(imageVariantsFor(initial.activities));
	let lastTick = 0;
	let lastWholeSecond = 0;
	let lastRemainingRep = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let voiceTimeout: ReturnType<typeof setTimeout> | undefined;
	let wakeLock: WakeLockSentinelLike | null = null;
	let disposed = false;
	let announcementVersion = 0;

	const currentActivity = $derived(getConfig().activities[position.activityIndex]);
	const followingPosition = $derived(
		nextRoutinePosition(getConfig().activities, getConfig().setCount, position)
	);
	const followingActivity = $derived(
		followingPosition ? getConfig().activities[followingPosition.activityIndex] : undefined
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
			? ((phase === 'rest'
					? followingActivity
					: currentActivity) as CadencedRepGuidedRoutineActivity)
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
	const displaySetCount = $derived(
		displayActivitySetCount > 1 ? displayActivitySetCount : getConfig().setCount
	);
	const recoveryKey = $derived(
		`guided-routine:${getConfig().sessionIdentity ?? routineIdentity(getConfig().activities, getConfig().setCount)}`
	);

	function mount() {
		disposed = false;
		const config = getConfig();
		const voiceUrls = config.activities.flatMap((activity) =>
			activity.voiceUrl ? [activity.voiceUrl] : []
		);
		const soundUrls = [
			config.sounds.tick,
			config.sounds.start,
			config.sounds.complete,
			config.sounds.intro,
			config.sounds.beep,
			config.sounds.missionComplete,
			config.sounds.nextActivity
		].filter((url): url is string => Boolean(url));
		void config.audioManager
			.preload([...soundUrls, ...voiceUrls])
			.catch((error) => console.error('Routine audio preload failed:', error));
		const recovered = loadPausedSession<RoutineSnapshot>(recoveryKey, isRoutineSnapshot);
		if (recovered && isValidSnapshot(recovered, config.activities, config.setCount))
			restoreSnapshot(recovered);
		else startIntro();
		void requestWakeLock();
		document.addEventListener('visibilitychange', handleVisibilityChange);
	}

	function destroy() {
		disposed = true;
		announcementVersion += 1;
		if (timer) clearTimeout(timer);
		if (voiceTimeout) clearTimeout(voiceTimeout);
		void wakeLock?.release().catch((error) => console.error('Wake lock release failed:', error));
		if (phase !== 'complete') getConfig().audioManager.stopAll();
		if (phase !== 'complete' && phase !== 'intro') savePausedSession(recoveryKey, snapshot());
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	}

	function tick() {
		const now = performance.now();
		const elapsed = now - lastTick;
		lastTick = now;
		if (phase === 'complete' || isPaused || isManualReps) return;
		const nextTick = consumeRoutineTick(timeLeftMs, elapsed);
		timeLeftMs = nextTick.remainingMs;
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
				void getConfig().audioManager.play(getConfig().sounds.beep);
				playNumber(remaining);
			}
		}
		if (nextTick.shouldAdvance) advance();
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
		const config = getConfig();
		if (wholeSecond <= 0 || phase === 'intro') return;
		if (phase === 'rest') {
			if (shouldPlayRestCountdownTick(wholeSecond, config.restCountdownSeconds)) {
				void config.audioManager.play(config.restCountdownSound);
				return;
			}
			if (
				config.restPeriodicTickSeconds > 0 &&
				wholeSecond % Math.max(1, Math.floor(config.restPeriodicTickSeconds)) === 0
			)
				void config.audioManager.play(config.sounds.tick);
			return;
		}
		if (wholeSecond % 10 === 0 || wholeSecond <= 3)
			void config.audioManager.play(config.sounds.tick);
		if (phase === 'activity' && (wholeSecond % 5 === 0 || wholeSecond <= 3))
			playNumber(wholeSecond);
	}

	function beginCountdown(durationMs: number) {
		totalTimeMs = Math.max(1, durationMs);
		timeLeftMs = Math.max(0, durationMs);
		lastWholeSecond = Math.ceil(durationMs / 1000);
		lastTick = performance.now();
		if (durationMs <= 0) timer = setTimeout(advance, 0);
		else scheduleTick();
	}

	function startIntro() {
		announcementVersion += 1;
		phase = 'intro';
		isPaused = false;
		beginCountdown(10_000);
		void getConfig().audioManager.play(getConfig().sounds.intro);
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
		} else beginCountdown(durationMs);
		void getConfig().audioManager.play(getConfig().sounds.start);
	}

	function startRest() {
		if (!followingActivity) return;
		phase = 'rest';
		isPaused = false;
		const config = getConfig();
		const betweenSets = followingPosition?.setIndex !== position.setIndex;
		beginCountdown(
			(betweenSets ? config.restBetweenSetsSeconds : config.restBetweenActivitiesSeconds) * 1000
		);
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
		clearPausedSession(recoveryKey);
		await completeGuidedRoutine(playCompletionSounds, getConfig().oncomplete);
	}
	async function playCompletionSounds() {
		const config = getConfig();
		await config.audioManager.play(config.sounds.complete);
		if (config.sounds.missionComplete)
			await config.audioManager.play(config.sounds.missionComplete);
	}
	async function announceActivity(activity: GuidedRoutineActivity) {
		if (!activity.voiceUrl) return;
		const config = getConfig();
		const version = ++announcementVersion;
		if (config.sounds.nextActivity && !(await config.audioManager.play(config.sounds.nextActivity)))
			return;
		if (disposed || version !== announcementVersion) return;
		await config.audioManager.play(activity.voiceUrl);
	}
	function playNumber(value: number) {
		const config = getConfig();
		if (value > 0 && value <= 50 && config.sounds.number)
			void config.audioManager.play(config.sounds.number(value));
	}
	function cadenceFor(activity: CadencedRepGuidedRoutineActivity) {
		return activityCadences[cadenceKey(activity)] ?? activity.cadencePercent;
	}
	function handleCadenceChange(value: number) {
		if (!cadenceTarget) return;
		const cadencePercent = clampCadence(value);
		const remainingFraction = totalTimeMs > 0 ? timeLeftMs / totalTimeMs : 1;
		activityCadences = { ...activityCadences, [cadenceKey(cadenceTarget)]: cadencePercent };
		getConfig().oncadencechange?.(cadenceTarget, cadencePercent);
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
		if (cadenceTarget) getConfig().oncadencecommit?.(cadenceTarget, clampCadence(value));
	}
	function selectImageVariant(activity: GuidedRoutineActivity, variantId: string) {
		activityImageVariants = { ...activityImageVariants, [String(activity.id)]: variantId };
		getConfig().onimagevariantcommit?.(activity, variantId);
	}
	function completeManualActivity() {
		if (currentActivity?.type === 'manual-reps') advance();
	}
	function togglePause() {
		isPaused = !isPaused;
		lastTick = performance.now();
		if (isPaused) {
			if (timer) clearTimeout(timer);
		} else scheduleTick();
	}
	function skip() {
		announcementVersion += 1;
		getConfig().audioManager.stopAll();
		advance();
	}
	function close() {
		announcementVersion += 1;
		getConfig().audioManager.stopAll();
		getConfig().oncancel();
	}
	async function requestWakeLock() {
		try {
			const navigatorWithWakeLock = navigator as Navigator & {
				wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
			};
			const acquired = (await navigatorWithWakeLock.wakeLock?.request('screen')) ?? null;
			if (disposed) {
				void acquired?.release();
				return;
			}
			wakeLock = acquired;
			wakeLock?.addEventListener('release', () => (wakeLock = null));
		} catch (error) {
			console.error('Wake lock failed:', error);
		}
	}
	function handleVisibilityChange() {
		if (document.visibilityState === 'hidden') {
			if (!isPaused && phase !== 'complete' && !isManualReps) togglePause();
			return;
		}
		if (!wakeLock) void requestWakeLock();
	}
	function snapshot(): RoutineSnapshot {
		return {
			phase: phase === 'complete' ? 'intro' : phase,
			position,
			timeLeftMs,
			totalTimeMs,
			activityCadences,
			activityImageVariants
		};
	}
	function restoreSnapshot(value: RoutineSnapshot) {
		phase = value.phase;
		position = value.position;
		timeLeftMs = value.timeLeftMs;
		totalTimeMs = value.totalTimeMs;
		activityCadences = value.activityCadences;
		activityImageVariants = value.activityImageVariants;
		isPaused = true;
	}

	return {
		get phase() {
			return phase;
		},
		get currentActivity() {
			return currentActivity;
		},
		get displayActivity() {
			return displayActivity;
		},
		get displayPosition() {
			return displayPosition;
		},
		get displaySide() {
			return displaySide;
		},
		get selectedImageVariant() {
			return selectedImageVariant;
		},
		get displayImageUrl() {
			return displayImageUrl;
		},
		get cadenceTarget() {
			return cadenceTarget;
		},
		get targetCadence() {
			return targetCadence;
		},
		get progress() {
			return progress;
		},
		get displayRep() {
			return displayRep;
		},
		get isManualReps() {
			return isManualReps;
		},
		get displaySetIndex() {
			return displaySetIndex;
		},
		get displaySetCount() {
			return displaySetCount;
		},
		get timeLeftMs() {
			return timeLeftMs;
		},
		get isPaused() {
			return isPaused;
		},
		mount,
		destroy,
		handleCadenceChange,
		commitCadence,
		selectImageVariant,
		completeManualActivity,
		togglePause,
		skip,
		close
	};
}

export type RoutineController = ReturnType<typeof createRoutineController>;

function cadencesFor(activities: GuidedRoutineActivity[]) {
	return Object.fromEntries(
		activities.flatMap((activity) =>
			activity.type === 'cadenced-reps'
				? [[cadenceKey(activity), activity.cadencePercent] as const]
				: []
		)
	);
}
function imageVariantsFor(activities: GuidedRoutineActivity[]) {
	return Object.fromEntries(
		activities.flatMap((activity) =>
			activity.selectedImageVariantId
				? [[String(activity.id), activity.selectedImageVariantId] as const]
				: []
		)
	);
}
function cadenceKey(activity: CadencedRepGuidedRoutineActivity) {
	return String(activity.cadenceKey ?? activity.id);
}
function clampCadence(value: number) {
	return Math.max(50, Math.min(150, Math.round(value / 5) * 5));
}
function isValidSnapshot(value: RoutineSnapshot, routine: GuidedRoutineActivity[], sets: number) {
	return (
		value.position.activityIndex >= 0 &&
		value.position.activityIndex < routine.length &&
		value.position.setIndex >= 0 &&
		value.position.setIndex < Math.max(1, sets) &&
		value.timeLeftMs >= 0 &&
		value.totalTimeMs > 0
	);
}
function isRoutineSnapshot(value: unknown): value is RoutineSnapshot {
	if (!value || typeof value !== 'object') return false;
	const snapshot = value as Partial<RoutineSnapshot>;
	return (
		(snapshot.phase === 'intro' || snapshot.phase === 'activity' || snapshot.phase === 'rest') &&
		Boolean(
			snapshot.position &&
				typeof snapshot.position.activityIndex === 'number' &&
				typeof snapshot.position.setIndex === 'number' &&
				typeof snapshot.position.activityRepeatIndex === 'number'
		) &&
		typeof snapshot.timeLeftMs === 'number' &&
		typeof snapshot.totalTimeMs === 'number' &&
		Boolean(snapshot.activityCadences && snapshot.activityImageVariants)
	);
}
function routineIdentity(routine: GuidedRoutineActivity[], sets: number) {
	return `${sets}:${routine.map((activity) => `${activity.id}:${activity.type}`).join('|')}`;
}
