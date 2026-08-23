import { CalendarDate, CalendarDateTime, fromDate, toZoned } from '@internationalized/date';
import { isValidTimeZone } from '$lib/trackers/dates';

export const DEFAULT_EATING_WINDOW_START = '12:00';
export const DEFAULT_EATING_WINDOW_END = '20:00';

export type EatingWindow = {
	enabled: boolean;
	start: string;
	end: string;
};

type EatingWindowPhase = 'before' | 'during' | 'after';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateEatingWindow(start: unknown, end: unknown) {
	if (!isTime(start) || !isTime(end)) throw new Error('Choose valid eating window times.');
	if (start >= end) throw new Error('Choose an eating window end time after its start time.');
	return { start, end };
}

export function eatingWindowLabel(window: EatingWindow, now: Date, timeZone: string) {
	const period = eatingWindowPeriod(window, now, timeZone);
	const duration = formatHumanDuration(period.endsAt.getTime() - now.getTime());
	if (period.phase === 'before') return `Eating time starts in ${duration}`;
	if (period.phase === 'during') return `Eating time lasts ${duration}`;
	return `Next eating time starts in ${duration}`;
}

export function formatHumanDuration(milliseconds: number) {
	const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60_000));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return [durationPart(hours, 'hour'), durationPart(minutes, 'minute')].filter(Boolean).join(' ');
}

function eatingWindowPeriod(window: EatingWindow, now: Date, timeZone: string) {
	const { start, end } = validateEatingWindow(window.start, window.end);
	if (!Number.isFinite(now.getTime()) || !isValidTimeZone(timeZone))
		throw new Error('Invalid time.');
	const day = localDay(now, timeZone);
	const startAt = localTime(day, start, timeZone);
	if (now < startAt) return period('before', startAt);
	const endAt = localTime(day, end, timeZone);
	if (now < endAt) return period('during', endAt);
	return period('after', localTime(day.add({ days: 1 }), start, timeZone));
}

function localDay(now: Date, timeZone: string) {
	const localNow = fromDate(now, timeZone);
	return new CalendarDate(localNow.year, localNow.month, localNow.day);
}

function localTime(day: CalendarDate, time: string, timeZone: string) {
	const [hour, minute] = time.split(':').map(Number);
	return toZoned(
		new CalendarDateTime(day.year, day.month, day.day, hour, minute),
		timeZone
	).toDate();
}

function period(phase: EatingWindowPhase, endsAt: Date) {
	return { phase, endsAt };
}

function durationPart(value: number, unit: string) {
	return value ? `${value} ${unit}${value === 1 ? '' : 's'}` : '';
}

function isTime(value: unknown): value is string {
	return typeof value === 'string' && TIME_PATTERN.test(value);
}
