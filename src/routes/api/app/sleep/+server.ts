import { error, json } from '@sveltejs/kit';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from '$lib/trackers/dates';
import {
	ensureSleepConnection,
	getDailySleep,
	getSleepConnection,
	updateSleepGoal
} from '../../../(trackers)/sleep/server/sleep';
import { averageSleepMinutes, parseSleepGoal } from '../../../(trackers)/sleep/sleep';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const timeZone = url.searchParams.get('timeZone') ?? 'UTC';
	await ensureSleepConnection(locals.db, locals.user.id, timeZone);
	const connection = await getSleepConnection(locals.db, locals.user.id);
	const today = localDateForInstant(new Date(), connection?.companionTimeZone ?? timeZone);
	const date = selectedDate(url.searchParams.get('date'), today);
	const dateKeys = dateKeysEndingAt(today, 7);
	const history = await getDailySleep(locals.db, locals.user.id, dateKeys[0], today);
	const selected =
		date >= dateKeys[0] ? history : await getDailySleep(locals.db, locals.user.id, date, date);
	const totals = new Map(history.map((day) => [day.localDate, day]));
	const days = dateKeys.toReversed().map((localDate) => ({
		date: localDate,
		durationSeconds: totals.get(localDate)?.durationSeconds ?? 0,
		sessionCount: totals.get(localDate)?.sessionCount ?? 0
	}));
	return json({
		connection,
		isSynced: Boolean(connection?.lastReceivedAt),
		hasData: [...history, ...selected].some((day) => day.durationSeconds > 0),
		date,
		today,
		markedDates: [...new Set([...history, ...selected].map((day) => day.localDate))],
		durationSeconds: selected.find((day) => day.localDate === date)?.durationSeconds ?? 0,
		days,
		averageMinutes: averageSleepMinutes(days)
	});
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const body = (await request.json().catch(() => null)) as {
		dailyGoalMinutes?: unknown;
		timeZone?: unknown;
	} | null;
	let dailyGoalMinutes: number;
	try {
		dailyGoalMinutes = parseSleepGoal(String(body?.dailyGoalMinutes ?? ''));
	} catch (cause) {
		error(400, cause instanceof Error ? cause.message : 'Invalid daily sleep goal.');
	}
	await ensureSleepConnection(locals.db, locals.user.id, String(body?.timeZone ?? 'UTC'));
	await updateSleepGoal(locals.db, locals.user.id, dailyGoalMinutes);
	return json({ dailyGoalMinutes });
};

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidDateKey(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}
