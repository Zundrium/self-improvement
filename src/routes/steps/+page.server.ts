import { error, fail } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { dateKeysEndingAt, localDateForInstant } from './steps';
import { createStepConnection, getDailySteps, getStepConnection } from './server/steps';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = requireDb(event.locals);
	try {
		return await loadStepPage(db, user.id, event.url.origin);
	} catch (cause) {
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

async function loadStepPage(db: ReturnType<typeof requireDb>, userId: string, origin: string) {
	const connection = await getStepConnection(db, userId);
	const timeZone = connection?.timeZone ?? 'UTC';
	const today = localDateForInstant(new Date(), timeZone);
	const dateKeys = dateKeysEndingAt(today, 7);
	const totals = await getDailySteps(db, userId, dateKeys[0], today);
	const totalsByDate = new Map(totals.map((total) => [total.localDate, total.count]));
	return {
		connection: connectionView(connection),
		webhookUrl: new URL('/steps/api/health-connect', origin).toString(),
		hasStepData: totals.length > 0,
		today,
		days: dateKeys.map((date) => ({ date, count: totalsByDate.get(date) ?? 0 }))
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
