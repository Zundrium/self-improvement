import { isValidDateKey } from '$lib/trackers/dates';

export const BREATHING_PHASES = [
	{ id: 'inhale', label: 'Breathe in', instruction: 'Through your nose', seconds: 4 },
	{ id: 'hold', label: 'Hold', instruction: 'Keep your breath gentle', seconds: 7 },
	{ id: 'exhale', label: 'Breathe out', instruction: 'Slowly through your mouth', seconds: 8 }
] as const;

export const BREATHING_ROUNDS = 6;
export const BREATHING_CYCLE_SECONDS = BREATHING_PHASES.reduce(
	(total, phase) => total + phase.seconds,
	0
);
export const BREATHING_DURATION_SECONDS = BREATHING_CYCLE_SECONDS * BREATHING_ROUNDS;

export type BreathingPhase = (typeof BREATHING_PHASES)[number];
export type BreathingCompletion = {
	localDate: string;
	startedAt: number;
};
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function breathingStep(elapsedMilliseconds: number) {
	const elapsedSeconds = Math.max(0, elapsedMilliseconds / 1000);
	const cycleElapsed = elapsedSeconds % BREATHING_CYCLE_SECONDS;
	let phaseStart = 0;
	for (const phase of BREATHING_PHASES) {
		const phaseEnd = phaseStart + phase.seconds;
		if (cycleElapsed < phaseEnd) {
			return {
				phase,
				round: Math.min(Math.floor(elapsedSeconds / BREATHING_CYCLE_SECONDS) + 1, BREATHING_ROUNDS),
				remainingSeconds: Math.ceil(phaseEnd - cycleElapsed)
			};
		}
		phaseStart = phaseEnd;
	}
	return { phase: BREATHING_PHASES[0], round: BREATHING_ROUNDS, remainingSeconds: 1 };
}

export function formatTimer(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isValidLocalDate(value: string) {
	return isValidDateKey(value);
}
