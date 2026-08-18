import { error, json } from '@sveltejs/kit';
import { getExercisePreferences } from '../../../../(trackers)/fitness/server/workouts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	return json({ exercises: await getExercisePreferences(locals.db, locals.user.id) });
};
