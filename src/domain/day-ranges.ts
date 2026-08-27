import { CalendarDate, fromDate, toZoned } from '@internationalized/date';
import { validationFailure } from './errors';

export type LocalDayRange = {
	date: string;
	start: string;
	end: string;
	startMilliseconds: number;
	endMilliseconds: number;
};

export function rollingLocalDayRanges(now: Date, timeZone: string, totalDays = 7) {
	if (!Number.isInteger(totalDays) || totalDays < 1) throw validationFailure();
	const zonedNow = fromDate(validDate(now), timeZone);
	const today = new CalendarDate(zonedNow.year, zonedNow.month, zonedNow.day);
	return Array.from({ length: totalDays }, (_, index) =>
		toLocalDayRange(today.subtract({ days: totalDays - index - 1 }), timeZone)
	);
}

export function toLocalDayRange(date: CalendarDate, timeZone: string): LocalDayRange {
	const startDate = toZoned(date, timeZone).toDate();
	const endDate = toZoned(date.add({ days: 1 }), timeZone).toDate();
	if (endDate <= startDate) throw validationFailure();
	return {
		date: date.toString(),
		start: startDate.toISOString(),
		end: endDate.toISOString(),
		startMilliseconds: startDate.getTime(),
		endMilliseconds: endDate.getTime()
	};
}

function validDate(date: Date) {
	if (!Number.isFinite(date.getTime())) throw validationFailure();
	return date;
}
