import { isValidDateKey } from '$lib/trackers/dates';

export const BREATHING_PHASES = [
	{ id: 'inhale', label: 'Inhale', seconds: 4 },
	{ id: 'hold', label: 'Hold', seconds: 7 },
	{ id: 'exhale', label: 'Exhale', seconds: 8 }
] as const;

export const BREATHING_ROUNDS = 6;
export const BREATHING_CYCLE_SECONDS = breathingCycleSeconds(true);
export const BREATHING_DURATION_SECONDS = breathingDurationSeconds(true);

export type BreathingPhase = (typeof BREATHING_PHASES)[number];
export type BreathingCompletion = {
	localDate: string;
	startedAt: number;
	includeHold: boolean;
};
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function breathingPhases(includeHold: boolean): readonly BreathingPhase[] {
	return includeHold ? BREATHING_PHASES : BREATHING_PHASES.filter((phase) => phase.id !== 'hold');
}

export function breathingCycleSeconds(includeHold: boolean) {
	return breathingPhases(includeHold).reduce((total, phase) => total + phase.seconds, 0);
}

export function breathingDurationSeconds(includeHold: boolean) {
	return breathingCycleSeconds(includeHold) * BREATHING_ROUNDS;
}

export function breathingStep(elapsedMilliseconds: number, includeHold = true) {
	const phases = breathingPhases(includeHold);
	const cycleSeconds = breathingCycleSeconds(includeHold);
	const elapsedSeconds = Math.max(0, elapsedMilliseconds / 1000);
	const cycleElapsed = elapsedSeconds % cycleSeconds;
	let phaseStart = 0;
	for (const phase of phases) {
		const phaseEnd = phaseStart + phase.seconds;
		if (cycleElapsed < phaseEnd) {
			return {
				phase,
				round: Math.min(Math.floor(elapsedSeconds / cycleSeconds) + 1, BREATHING_ROUNDS),
				remainingSeconds: Math.ceil(phaseEnd - cycleElapsed)
			};
		}
		phaseStart = phaseEnd;
	}
	return { phase: phases[0], round: BREATHING_ROUNDS, remainingSeconds: 1 };
}

export function formatTimer(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isValidLocalDate(value: string) {
	return isValidDateKey(value);
}
