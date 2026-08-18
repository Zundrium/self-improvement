import { error, json } from '@sveltejs/kit';
import { todayIso } from '$lib/utils';
import { getWorkoutProgram } from '../../../(trackers)/fitness/server/workouts';
import { isValidCompletionDate } from '../../../(trackers)/fitness/fitness';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const today = todayIso();
	const date = url.searchParams.get('date') ?? today;
	if (!isValidCompletionDate(date) || date > today) {
		error(400, 'Choose today or an earlier valid date.');
	}
	return json({ ...(await getWorkoutProgram(locals.db, locals.user.id)), date, today });
};
