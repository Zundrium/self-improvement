import { localDateForInstant } from '$lib/trackers/dates';
import type { ActionEnvironment } from './contracts';

export function buildActionEnvironment(now: Date, timeZone: string): ActionEnvironment {
	return {
		now,
		timeZone,
		localDate: localDateForInstant(now, timeZone),
		localMinuteOfDay: localMinuteOfDay(now, timeZone)
	};
}

function localMinuteOfDay(now: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(now);
	const hour = Number(parts.find(({ type }) => type === 'hour')?.value);
	const minute = Number(parts.find(({ type }) => type === 'minute')?.value);
	return hour * 60 + minute;
}
