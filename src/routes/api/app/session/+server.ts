import { error, json } from '@sveltejs/kit';
import { getEnabledTrackers } from '$lib/server/trackers/preferences';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	return json({
		user: locals.user,
		enabledTrackers: await getEnabledTrackers(locals.db, locals.user.id)
	});
};
