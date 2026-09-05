import type { DatedData } from '$lib/trackers/model';

export type ScreenTimeSettingsData = { dailyLimitMinutes: number };
export type ScreenTimeData = DatedData & {
	settings: ScreenTimeSettingsData;
	connection: { lastReceivedAt: string | null } | null;
	isSynced: boolean;
	hasData: boolean;
	usage: {
		totalMinutes: number;
		apps: Array<{ package: string; name: string; minutes: number; last_used: string }>;
	};
	knownApps: Array<{ package: string; name: string; tracked: boolean }>;
	averageMinutes: number;
	historyMaxMinutes: number;
	days: Array<{ date: string; totalMinutes: number }>;
};

export function summarizeUsage(days: Array<{ totalMinutes: number }>) {
	const totalMinutes = days.reduce((total, day) => total + day.totalMinutes, 0);
	return {
		totalMinutes,
		averageMinutes: days.length ? Math.round(totalMinutes / days.length) : 0,
		maxMinutes: Math.max(1, ...days.map((day) => day.totalMinutes))
	};
}
