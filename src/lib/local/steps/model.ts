import type { DatedData } from '$lib/trackers/model';

export type StepsSettingsData = { dailyGoal: number };
export type StepsData = DatedData & {
	settings: StepsSettingsData;
	connection: { dailyGoal: number; lastReceivedAt: string | null } | null;
	isSynced: boolean;
	hasData: boolean;
	steps: number;
	days: Array<{ date: string; count: number }>;
};
