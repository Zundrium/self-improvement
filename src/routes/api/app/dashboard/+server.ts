import { error, json } from '@sveltejs/kit';
import { loadDashboard } from '$lib/server/app/dashboard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	return json(await loadDashboard(locals.db, locals.user.id, url.searchParams.get('date')));
};
