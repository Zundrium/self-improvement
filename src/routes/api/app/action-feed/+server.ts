import { error, json } from '@sveltejs/kit';
import { loadActionFeed } from '$lib/server/app/action-feed';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || !locals.db) error(401, 'Authentication required.');
	return json(await loadActionFeed(locals.db, locals.user.id, url.searchParams.get('date')));
};
