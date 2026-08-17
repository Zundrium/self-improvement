export const flowOptions = [
	{ value: 'spotting', label: 'Spotting' },
	{ value: 'light', label: 'Light' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'heavy', label: 'Heavy' }
] as const;

export type MenstruationFlow = (typeof flowOptions)[number]['value'];

export function periodInputFromForm(form: FormData) {
	const localDate = String(form.get('localDate') ?? '');
	const flow = String(form.get('flow') ?? '');
	const notes = String(form.get('notes') ?? '').trim();
	if (!isValidDate(localDate)) throw new Error('Choose a valid date.');
	if (!isMenstruationFlow(flow)) throw new Error('Choose a valid flow.');
	if (notes.length > 1_000) throw new Error('Keep notes under 1,000 characters.');
	return { localDate, flow, notes };
}

export function isValidDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const parsed = new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isMenstruationFlow(value: string): value is MenstruationFlow {
	return flowOptions.some((option) => option.value === value);
}

export function flowLabel(flow: MenstruationFlow) {
	return flowOptions.find((option) => option.value === flow)?.label ?? flow;
}

export function cycleSummary(localDates: string[], today?: string) {
	const starts = cycleStarts(localDates);
	if (!starts.length) return null;
	const lengths = cycleLengths(starts);
	const averageCycleDays = average(lengths) ?? 28;
	return {
		lastPeriodStarted: starts.at(-1)!,
		averageCycleDays,
		averageFromHistory: lengths.length > 0,
		estimatedNextPeriod: nextPeriod(starts.at(-1)!, averageCycleDays, today)
	};
}

function cycleStarts(localDates: string[]) {
	const dates = [...new Set(localDates)].sort();
	return dates.filter((date, index) => index === 0 || daysBetween(dates[index - 1], date) > 1);
}

function cycleLengths(starts: string[]) {
	return starts
		.slice(1)
		.map((date, index) => daysBetween(starts[index], date))
		.filter((days) => days >= 15 && days <= 60);
}

function average(values: number[]) {
	if (!values.length) return null;
	return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
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
