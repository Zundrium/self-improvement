import { isValidCalendarDate } from '$lib/utils';

export function isValidTimeZone(value: string) {
	if (!value || value.length > 100) return false;
	try {
		new Intl.DateTimeFormat('en', { timeZone: value }).format();
		return true;
	} catch {
		return false;
	}
}

export function localDateForInstant(instant: string | Date, timeZone: string) {
	const date = typeof instant === 'string' ? new Date(instant) : instant;
	const parts = dateParts(date, timeZone);
	return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isLocalDayStart(instant: string, timeZone: string) {
	const parts = dateParts(new Date(instant), timeZone, true);
	return parts.hour === '00' && parts.minute === '00' && parts.second === '00';
}

export function isValidDateKey(value: string) {
	return isValidCalendarDate(value);
}

export function dateKeysEndingAt(endDateKey: string, total: number) {
	const [year, month, day] = endDateKey.split('-').map(Number);
	const end = new Date(Date.UTC(year, month - 1, day));
	return Array.from({ length: total }, (_, index) => dateKey(addDays(end, index - total + 1)));
}

function dateParts(date: Date, timeZone: string, includeTime = false) {
	const options: Intl.DateTimeFormatOptions = {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	};
	if (includeTime) Object.assign(options, timeOptions());
	return Object.fromEntries(
		new Intl.DateTimeFormat('en-GB', options)
			.formatToParts(date)
			.filter(({ type }) => type !== 'literal')
			.map(({ type, value }) => [type, value])
	);
}

function timeOptions(): Intl.DateTimeFormatOptions {
	return {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	};
}

function addDays(date: Date, days: number) {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

function dateKey(date: Date) {
	return date.toISOString().slice(0, 10);
}
