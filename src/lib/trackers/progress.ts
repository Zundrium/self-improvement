import type { TrackerProgressDay } from './model';
import { dateKeysEndingAt } from './dates';

export type TrackerProgressMode = 'line' | 'check';

export type TrackerProgressPresentation = {
	mode: TrackerProgressMode;
	days: TrackerProgressDay[];
	maxValue?: number;
	ariaLabel: string;
};

export function trackerProgressDays(
	selectedDate: string,
	today: string,
	valueForDate: (date: string) => number | null
): TrackerProgressDay[] {
	return dateKeysEndingAt(shiftDate(selectedDate, 2), 5).map((date) => ({
		date,
		value: date <= today ? valueForDate(date) : null
	}));
}

function shiftDate(value: string, days: number) {
	const date = new Date(`${value}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}
