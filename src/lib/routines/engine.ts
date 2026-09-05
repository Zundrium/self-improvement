export type RoutinePhase = 'intro' | 'activity' | 'rest' | 'complete';

/** Advances a countdown without allowing one delayed tick to skip more than one phase. */
export function consumeRoutineTick(remainingMs: number, elapsedMs: number) {
	const nextRemainingMs = Math.max(0, remainingMs - Math.max(0, elapsedMs));
	return { remainingMs: nextRemainingMs, shouldAdvance: nextRemainingMs === 0 };
}

export function pausedRoutineTick(remainingMs: number) {
	return { remainingMs, shouldAdvance: false };
}
