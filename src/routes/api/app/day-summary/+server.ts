import { error, json } from '@sveltejs/kit';
import { loadDaySummary } from '$lib/server/app/day-summary';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	const timeZone = request.headers.get('X-Time-Zone')?.trim();
	return json(
		await loadDaySummary(locals.db, locals.user.id, url.searchParams.get('date'), timeZone)
	);
};
