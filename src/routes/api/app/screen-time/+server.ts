import { error, json } from '@sveltejs/kit';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from '$lib/trackers/dates';
import {
	parseScreenTimeTrackedAppChoice,
	summarizeUsage
} from '../../../(trackers)/screen-time/screen-time';
import {
	ensureScreenTimeConnection,
	getDailyScreenTime,
	getKnownScreenTimeApps,
	getScreenTimeConnection,
	setScreenTimeAppTracked
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
	const [history, knownApps] = await Promise.all([
		getDailyScreenTime(locals.db, locals.user.id, dateKeys[0], today),
		getKnownScreenTimeApps(locals.db, locals.user.id)
	]);
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
		hasData: [...history, ...selected].length > 0,
		date,
		today,
		markedDates: [...new Set([...history, ...selected].map((day) => day.localDate))],
		usage: { totalMinutes: snapshot?.totalMinutes ?? 0, apps: snapshot?.apps ?? [] },
		knownApps,
		averageMinutes: summary.averageMinutes,
		historyMaxMinutes: summary.maxMinutes,
		days: chronologicalDays.toReversed()
	});
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const choice = trackedAppChoice(await request.json().catch(() => null));
	await setScreenTimeAppTracked(locals.db, locals.user.id, choice.package, choice.tracked);
	return json(choice);
};

function trackedAppChoice(input: unknown) {
	try {
		return parseScreenTimeTrackedAppChoice(input);
	} catch {
		error(400, 'Choose a valid app package and tracked state.');
	}
}

function selectedDate(requestedDate: string | null, today: string) {
	const date = requestedDate ?? today;
	if (!isValidDateKey(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}
