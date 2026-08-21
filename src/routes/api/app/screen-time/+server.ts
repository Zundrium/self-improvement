import { error, json } from '@sveltejs/kit';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from '$lib/trackers/dates';
import { summarizeUsage, topApps } from '../../../(trackers)/screen-time/screen-time';
import {
	ensureScreenTimeConnection,
	getDailyScreenTime,
	getScreenTimeConnection
} from '../../../(trackers)/screen-time/server/screen-time';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const timeZone = url.searchParams.get('timeZone') ?? 'UTC';
	await ensureScreenTimeConnection(locals.db, locals.user.id, timeZone);
	const connection = await getScreenTimeConnection(locals.db, locals.user.id);
	const today = localDateForInstant(new Date(), connection?.companionTimeZone ?? timeZone);
	const date = selectedDate(url.searchParams.get('date'), today);
	const dateKeys = dateKeysEndingAt(today, 7);
	const history = await getDailyScreenTime(locals.db, locals.user.id, dateKeys[0], today);
	const selected =
		date >= dateKeys[0] ? history : await getDailyScreenTime(locals.db, locals.user.id, date, date);
	const snapshot = selected.find((day) => day.localDate === date);
	const totals = new Map(history.map((day) => [day.localDate, day.totalMinutes]));
	const chronologicalDays = dateKeys.map((day) => ({
		date: day,
		totalMinutes: totals.get(day) ?? 0
	}));
	const summary = summarizeUsage(chronologicalDays);
	return json({
		connection: connection ? { lastReceivedAt: connection.lastReceivedAt } : null,
		isSynced: Boolean(connection?.lastReceivedAt),
		date,
		today,
		markedDates: [...new Set([...history, ...selected].map((day) => day.localDate))],
		usage: { totalMinutes: snapshot?.totalMinutes ?? 0, apps: topApps(snapshot?.apps ?? []) },
		averageMinutes: summary.averageMinutes,
		historyMaxMinutes: summary.maxMinutes,
		days: chronologicalDays.toReversed()
	});
};

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidDateKey(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}
