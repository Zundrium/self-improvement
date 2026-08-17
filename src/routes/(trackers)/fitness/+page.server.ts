import { error } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { isValidCompletionDate } from './fitness';
import { getWorkoutProgram } from './server/workouts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const today = todayIso();
	const date = selectedDate(event.url, today);
	try {
		return { ...(await getWorkoutProgram(requireDb(event.locals), user.id)), date, today };
	} catch (cause) {
		console.error('Failed to load workouts:', cause);
		error(500, 'Unable to load the workout program. Apply the database migrations and try again.');
	}
};

function selectedDate(url: URL, today: string) {
	const date = url.searchParams.get('date') ?? today;
	if (!isValidCompletionDate(date) || date > today) {
		error(400, 'Choose today or an earlier valid date.');
	}
	return date;
}
