import { error, json } from '@sveltejs/kit';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from '$lib/trackers/dates';
import {
	ensureStepConnection,
	getDailySteps,
	getStepConnection
} from '../../../(trackers)/steps/server/steps';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const timeZone = url.searchParams.get('timeZone') ?? 'UTC';
	await ensureStepConnection(locals.db, locals.user.id, timeZone);
	const connection = await getStepConnection(locals.db, locals.user.id);
	const today = localDateForInstant(new Date(), connection?.companionTimeZone ?? timeZone);
	const date = selectedDate(url.searchParams.get('date'), today);
	const dateKeys = dateKeysEndingAt(today, 7);
	const history = await getDailySteps(locals.db, locals.user.id, dateKeys[0], today);
	const selected =
		date >= dateKeys[0] ? history : await getDailySteps(locals.db, locals.user.id, date, date);
	const totals = new Map(history.map((day) => [day.localDate, day.count]));
	return json({
		connection,
		isSynced: Boolean(connection?.lastReceivedAt),
		hasData: [...history, ...selected].some((day) => day.count > 0),
		date,
		today,
		steps: selected.find((day) => day.localDate === date)?.count ?? 0,
		days: dateKeys.toReversed().map((day) => ({ date: day, count: totals.get(day) ?? 0 }))
	});
};

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidDateKey(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}
