import { error, fail, isHttpError } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from '$lib/trackers/dates';
import {
	createScreenTimeConnection,
	getDailyScreenTime,
	getScreenTimeConnection,
	hasDailyScreenTime
} from './server/screen-time';
import { summarizeUsage, topApps } from './screen-time';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	try {
		return await loadScreenTimePage(requireDb(event.locals), user.id, event.url);
	} catch (cause) {
		if (isHttpError(cause)) throw cause;
		console.error('Failed to load screen time:', cause);
		error(500, 'Unable to load screen time. Apply the database migrations and try again.');
	}
};

export const actions: Actions = {
	connection: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		try {
			const token = await createScreenTimeConnection(
				requireDb(event.locals),
				user.id,
				String(form.get('timeZone') ?? 'UTC')
			);
			return { kind: 'connection', token, message: 'Webhook credentials created.' };
		} catch (cause) {
			console.error('Failed to create screen-time connection:', cause);
			return fail(500, { kind: 'connection', error: 'Could not create webhook credentials.' });
		}
	}
};

async function loadScreenTimePage(db: ReturnType<typeof requireDb>, userId: string, url: URL) {
	const connection = await getScreenTimeConnection(db, userId);
	const today = localDateForInstant(new Date(), connection?.timeZone ?? 'UTC');
	const date = url.searchParams.get('date') ?? today;
	if (!isValidDateKey(date) || date > today) error(400, 'Choose today or an earlier valid date.');

	const dateKeys = dateKeysEndingAt(today, 7);
	const [historySnapshots, hasRecords] = await Promise.all([
		getDailyScreenTime(db, userId, dateKeys[0], today),
		hasDailyScreenTime(db, userId)
	]);
	const selectedSnapshots =
		date >= dateKeys[0] ? historySnapshots : await getDailyScreenTime(db, userId, date, date);
	const selected = selectedSnapshots.find((snapshot) => snapshot.localDate === date);
	const snapshotsByDate = new Map(
		historySnapshots.map((snapshot) => [snapshot.localDate, snapshot])
	);
	const chronologicalDays = dateKeys.map((day) => ({
		date: day,
		totalMinutes: snapshotsByDate.get(day)?.totalMinutes ?? 0
	}));
	const summary = summarizeUsage(chronologicalDays);
	const markedDates = new Set(historySnapshots.map((snapshot) => snapshot.localDate));
	if (selected) markedDates.add(selected.localDate);

	return {
		connection: connectionView(connection),
		webhookUrl: new URL('/screen-time/api/usage', url.origin).toString(),
		isSynced: Boolean(connection?.lastReceivedAt && hasRecords),
		date,
		today,
		markedDates: [...markedDates],
		usage: {
			totalMinutes: selected?.totalMinutes ?? 0,
			apps: topApps(selected?.apps ?? [])
		},
		averageMinutes: summary.averageMinutes,
		historyMaxMinutes: summary.maxMinutes,
		days: chronologicalDays.toReversed()
	};
}

function connectionView(connection: Awaited<ReturnType<typeof getScreenTimeConnection>>) {
	if (!connection) return null;
	return {
		timeZone: connection.timeZone,
		appVersion: connection.appVersion,
		device: connection.device,
		source: connection.source,
		lastReceivedAt: connection.lastReceivedAt
	};
}
