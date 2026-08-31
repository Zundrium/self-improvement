import type { SleepAdherenceStatus } from '$lib/api-types';

export const DEFAULT_BEDTIME = '22:30';
export const LATE_USAGE_LIMIT_SECONDS = 300;
export const SLEEPING_MESSAGE = 'You should be sleeping :)';
const MORNING_END_MINUTES = 6 * 60;

export function formatUsageSeconds(seconds: number) {
	const wholeSeconds = Math.max(0, Math.round(seconds));
	if (wholeSeconds < 60) return `${wholeSeconds}s`;
	const minutes = Math.floor(wholeSeconds / 60);
	const remainingSeconds = wholeSeconds % 60;
	return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function statusLabel(status: SleepAdherenceStatus, setupRequired = false) {
	if (setupRequired) return 'Setup needed';
	if (status === 'pass') return 'On time';
	if (status === 'fail') return 'Missed';
	return 'Pending';
}

export function formatBedtime(bedtime: string) {
	const [hour, minute] = bedtime.split(':').map(Number);
	const date = new Date(2000, 0, 1, hour, minute);
	return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function isWithinSleepingWindow(bedtime: string, now = new Date()) {
	const currentMinutes = minutesFromLocalTime(now);
	const bedtimeMinutes = minutesFromTime(bedtime);

	if (currentMinutes < MORNING_END_MINUTES) {
		return bedtimeMinutes >= MORNING_END_MINUTES || currentMinutes > bedtimeMinutes;
	}

	return bedtimeMinutes >= MORNING_END_MINUTES && currentMinutes > bedtimeMinutes;
}

export function formatSleepTrackerMessage(bedtime: string, now = new Date()) {
	return isWithinSleepingWindow(bedtime, now)
		? SLEEPING_MESSAGE
		: formatTimeUntilBedtime(bedtime, now);
}

export function formatTimeUntilBedtime(bedtime: string, now = new Date()) {
	const bedtimeDate = nextBedtime(bedtime, now);
	const minutesUntilBedtime = Math.max(
		0,
		Math.ceil((bedtimeDate.getTime() - now.getTime()) / 60_000)
	);
	if (!minutesUntilBedtime) return 'Bedtime now';

	const hours = Math.floor(minutesUntilBedtime / 60);
	const minutes = minutesUntilBedtime % 60;
	return [formatDurationPart(hours, 'hour'), formatDurationPart(minutes, 'minute')]
		.filter(Boolean)
		.join(' ');
}

function nextBedtime(bedtime: string, now: Date) {
	const [hour, minute] = bedtime.split(':').map(Number);
	const bedtimeDate = new Date(now);
	bedtimeDate.setHours(hour, minute, 0, 0);
	if (bedtimeDate.getTime() <= now.getTime() - 60_000)
		bedtimeDate.setDate(bedtimeDate.getDate() + 1);
	return bedtimeDate;
}

function minutesFromLocalTime(date: Date) {
	return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60_000;
}

function minutesFromTime(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	return hour * 60 + minute;
}

function formatDurationPart(value: number, unit: string) {
	if (!value) return '';
	return `${value} ${unit}${value === 1 ? '' : 's'}`;
}
