import type { DatedData } from '$lib/trackers/model';

export type BreathingSettingsData = { rounds: number; includeHold: boolean };
export type BreathingData = DatedData & {
	settings: BreathingSettingsData;
	exercise: { localDate: string; technique: string; durationSeconds: number } | null;
};

export const BREATHING_ROUNDS = 6;
export function breathingDurationSeconds(includeHold: boolean, rounds = BREATHING_ROUNDS) {
	return (includeHold ? 19 : 12) * rounds;
}
