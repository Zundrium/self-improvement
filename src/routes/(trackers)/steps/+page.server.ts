import { error, fail, isHttpError } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { dateKeysEndingAt, isValidDateKey, localDateForInstant } from './steps';
import { createStepConnection, getDailySteps, getStepConnection } from './server/steps';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	try {
		return await loadStepPage(db, user.id, event.url);
	} catch (cause) {
		if (isHttpError(cause)) throw cause;
		console.error('Failed to load steps:', cause);
		error(500, 'Unable to load steps. Apply the database migrations and try again.');
	}
};

export const actions: Actions = {
	connection: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		try {
			const token = await createStepConnection(
				requireDb(event.locals),
				user.id,
				String(form.get('timeZone') ?? 'UTC')
			);
			return { kind: 'connection', token, message: 'Webhook credentials created.' };
		} catch (cause) {
			console.error('Failed to create step connection:', cause);
			return fail(500, { kind: 'connection', error: 'Could not create webhook credentials.' });
		}
	}
};

async function loadStepPage(db: ReturnType<typeof requireDb>, userId: string, url: URL) {
	const connection = await getStepConnection(db, userId);
	const today = localDateForInstant(new Date(), connection?.timeZone ?? 'UTC');
	const date = url.searchParams.get('date') ?? today;
	if (!isValidDateKey(date) || date > today) error(400, 'Choose today or an earlier valid date.');

	const dateKeys = dateKeysEndingAt(today, 7);
	const historyTotals = await getDailySteps(db, userId, dateKeys[0], today);
	const selectedTotals =
		date >= dateKeys[0] ? historyTotals : await getDailySteps(db, userId, date, date);
	const totalsByDate = new Map(historyTotals.map((total) => [total.localDate, total.count]));
	return {
		connection: connectionView(connection),
		webhookUrl: new URL('/steps/api/health-connect', url.origin).toString(),
		isSynced: Boolean(connection?.lastReceivedAt),
		date,
		today,
		steps: selectedTotals.find((total) => total.localDate === date)?.count ?? 0,
		days: dateKeys.toReversed().map((day) => ({ date: day, count: totalsByDate.get(day) ?? 0 }))
	};
}

function connectionView(connection: Awaited<ReturnType<typeof getStepConnection>>) {
	if (!connection) return null;
	return {
		timeZone: connection.timeZone,
		dailyGoal: connection.dailyGoal,
		appVersion: connection.appVersion,
		lastReceivedAt: connection.lastReceivedAt
	};
}
