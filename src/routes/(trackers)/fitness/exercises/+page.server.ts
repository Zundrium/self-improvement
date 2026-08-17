import { error } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { getExercisePreferences } from '../server/workouts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	try {
		return { exercises: await getExercisePreferences(requireDb(event.locals), user.id) };
	} catch (cause) {
		console.error('Failed to load fitness exercises:', cause);
		error(500, 'Unable to load exercises.');
	}
};
