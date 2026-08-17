import { error } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { getWorkoutProgram } from './server/workouts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	try {
		return await getWorkoutProgram(requireDb(event.locals), user.id);
	} catch (cause) {
		console.error('Failed to load workouts:', cause);
		error(500, 'Unable to load the workout program. Apply the database migrations and try again.');
	}
};
