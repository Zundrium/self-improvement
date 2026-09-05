import type { DatedData } from '$lib/trackers/model';

export type MeditationSettingsData = { defaultDurationSeconds: number };
export type MeditationData = DatedData & {
	settings: MeditationSettingsData;
	initialDurationSeconds: number;
	meditationHistory: Array<{ localDate: string; totalSeconds: number; sessionCount: number }>;
};
