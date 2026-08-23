import { error, json } from '@sveltejs/kit';

import { requireDb } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import {
	cancelFastingDay,
	getFastingDay
} from '../../../../../(trackers)/nutrition/server/fasting';
import { validDate } from '../../../../../(trackers)/nutrition/server/nutrition';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { db, user, date } = fastingRequest(event);
	return json({ date, fasting: Boolean(await getFastingDay(db, user.id, date)) });
};

export const DELETE: RequestHandler = async (event) => {
	const { db, user, date } = fastingRequest(event);
	if (!(await cancelFastingDay(db, user.id, date))) error(404, 'Fasting day not found.');
	return json({ date });
};

function fastingRequest(event: Parameters<RequestHandler>[0]) {
	if (!event.locals.user) error(401, 'Authentication required.');
	const date = event.params.date;
	if (!validDate(date) || date > todayIso()) {
		error(400, 'Choose a valid date that is not in the future.');
	}
	return { db: requireDb(event.locals), user: event.locals.user, date };
}
