import type { DatedData } from '$lib/trackers/model';

export type SleepAdherenceStatus = 'pending' | 'pass' | 'fail';
export type SleepSettingsData = { bedtime: string; remindersEnabled: boolean };
export type SleepUsageApp = { package: string; name: string; seconds: number };
export type SleepAdherenceSummary = {
	localDate: string;
	configuredBedtime: string;
	windowStartAt: string | null;
	windowEndAt: string | null;
	lateUsageSeconds: number;
	latestScreenActivityAt: string | null;
	usedApps: SleepUsageApp[];
	violatingApps: SleepUsageApp[];
	status: SleepAdherenceStatus;
};
export type SleepData = DatedData & {
	settings: SleepSettingsData;
	lastReceivedAt: string | null;
	isSynced: boolean;
	hasData: boolean;
	setupRequired: boolean;
	summary: SleepAdherenceSummary;
	days: SleepAdherenceSummary[];
};
