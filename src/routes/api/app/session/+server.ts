import { error, json } from '@sveltejs/kit';
import { loadGamification } from '$lib/server/gamification/gamification';
import { getEnabledTrackers } from '$lib/server/trackers/preferences';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const enabledTrackers = await getEnabledTrackers(locals.db, locals.user.id);
	const gamification = await loadGamification(
		locals.db,
		locals.user.id,
		enabledTrackers.map(({ id }) => id)
	);
	return json({ user: locals.user, enabledTrackers, gamification });
};
