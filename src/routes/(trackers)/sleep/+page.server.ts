import { error, fail, isHttpError } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from '$lib/trackers/dates';
import {
	createSleepConnection,
	getDailySleep,
	getSleepConnection,
	updateSleepGoal
} from './server/sleep';
import { averageSleepMinutes, parseSleepGoal } from './sleep';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	try {
		return await loadSleepPage(requireDb(event.locals), user.id, event.url);
	} catch (cause) {
		if (isHttpError(cause)) throw cause;
		console.error('Failed to load sleep:', cause);
		error(500, 'Unable to load sleep. Apply the database migrations and try again.');
	}
};

export const actions: Actions = {
	connection: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		try {
			const token = await createSleepConnection(
				requireDb(event.locals),
				user.id,
				String(form.get('timeZone') ?? 'UTC')
			);
			return { kind: 'connection', token, message: 'Webhook credentials created.' };
		} catch (cause) {
			console.error('Failed to create sleep connection:', cause);
			return fail(500, { kind: 'connection', error: 'Could not create webhook credentials.' });
		}
	},
	goal: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const result = readSleepGoal(form.get('dailyGoalMinutes'));
		if ('error' in result) return fail(400, { kind: 'goal', error: result.error });
		try {
			await updateSleepGoal(requireDb(event.locals), user.id, result.dailyGoalMinutes);
			return { kind: 'goal', message: 'Daily sleep goal updated.' };
		} catch (cause) {
			console.error('Failed to update sleep goal:', cause);
			return fail(500, { kind: 'goal', error: 'Could not update the daily sleep goal.' });
		}
	}
};

async function loadSleepPage(db: ReturnType<typeof requireDb>, userId: string, url: URL) {
	const connection = await getSleepConnection(db, userId);
	const today = localDateForInstant(new Date(), connectionTimeZone(connection));
	const date = selectedDate(url, today);
	const dateKeys = dateKeysEndingAt(today, 7);
	const history = await getDailySleep(db, userId, dateKeys[0], today);
	const selected = date >= dateKeys[0] ? history : await getDailySleep(db, userId, date, date);
	const totals = new Map(history.map((day) => [day.localDate, day]));
	const days = dateKeys.toReversed().map((localDate) => ({
		date: localDate,
		durationSeconds: totals.get(localDate)?.durationSeconds ?? 0,
		sessionCount: totals.get(localDate)?.sessionCount ?? 0
	}));
	const markedDates = new Set(history.map((day) => day.localDate));
	for (const day of selected) markedDates.add(day.localDate);
	return {
		connection: connectionView(connection),
		webhookUrl: new URL('/sleep/api/health-connect', url.origin).toString(),
		isSynced: Boolean(connection?.lastReceivedAt),
		date,
		today,
		markedDates: [...markedDates],
		durationSeconds: selected.find((day) => day.localDate === date)?.durationSeconds ?? 0,
		days,
		averageMinutes: averageSleepMinutes(days)
	};
}

function readSleepGoal(value: FormDataEntryValue | null) {
	try {
		return { dailyGoalMinutes: parseSleepGoal(value) };
	} catch (cause) {
		return { error: cause instanceof Error ? cause.message : 'Invalid daily sleep goal.' };
	}
}

function selectedDate(url: URL, today: string) {
	const date = url.searchParams.get('date') ?? today;
	if (!isValidDateKey(date) || date > today) error(400, 'Choose today or an earlier valid date.');
	return date;
}

function connectionView(connection: Awaited<ReturnType<typeof getSleepConnection>>) {
	if (!connection) return null;
	return {
		timeZone: connectionTimeZone(connection),
		dailyGoalMinutes: connection.dailyGoalMinutes,
		appVersion: connection.appVersion,
		lastReceivedAt: connection.lastReceivedAt
	};
}

function connectionTimeZone(connection: Awaited<ReturnType<typeof getSleepConnection>>) {
	return connection?.companionTimeZone ?? connection?.timeZone ?? 'UTC';
}
