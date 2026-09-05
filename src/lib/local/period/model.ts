export const menstruationFlows = ['spotting', 'light', 'medium', 'heavy'] as const;
export type MenstruationFlow = (typeof menstruationFlows)[number];
export type PeriodSettingsData = { defaultFlow: MenstruationFlow; fallbackCycleDays: number };
export type CycleSummary = NonNullable<ReturnType<typeof cycleSummary>>;
export type PeriodData = DatedData & {
	settings: PeriodSettingsData;
	entry: { localDate: string; flow: MenstruationFlow; notes: string; updatedAt: string } | null;
	recentEntries: Array<{ localDate: string; flow: MenstruationFlow }>;
	cycle: CycleSummary | null;
};
export function isMenstruationFlow(value: string): value is MenstruationFlow {
	return menstruationFlows.includes(value as MenstruationFlow);
}
export function cycleSummary(localDates: string[], today?: string, fallbackCycleDays = 28) {
	const starts = cycleStarts(localDates);
	if (!starts.length) return null;
	const lengths = starts
		.slice(1)
		.map((date, index) => daysBetween(starts[index], date))
		.filter((days) => days >= 15 && days <= 60);
	const averageCycleDays = lengths.length
		? Math.round(lengths.reduce((total, value) => total + value, 0) / lengths.length)
		: fallbackCycleDays;
	const lastPeriodStarted = starts.at(-1);
	if (!lastPeriodStarted) return null;
	return {
		lastPeriodStarted,
		averageCycleDays,
		averageFromHistory: lengths.length > 0,
		estimatedNextPeriod: nextPeriod(lastPeriodStarted, averageCycleDays, today)
	};
}
function cycleStarts(localDates: string[]) {
	const dates = [...new Set(localDates)].sort();
	return dates.filter((date, index) => index === 0 || daysBetween(dates[index - 1], date) > 1);
}
function daysBetween(start: string, end: string) {
	return Math.round(
		(Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000
	);
}
function nextPeriod(lastStart: string, cycleDays: number, today?: string) {
	let estimate = addDays(lastStart, cycleDays);
	while (today && estimate < today) estimate = addDays(estimate, cycleDays);
	return estimate;
}
function addDays(date: string, days: number) {
	const result = new Date(`${date}T00:00:00Z`);
	result.setUTCDate(result.getUTCDate() + days);
	return result.toISOString().slice(0, 10);
}
import type { DatedData } from '$lib/trackers/model';
