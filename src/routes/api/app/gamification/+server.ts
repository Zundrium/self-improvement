import { json } from '@sveltejs/kit';
import { loadGamification } from '$lib/server/gamification/gamification';
import { requireDb, requireUser } from '$lib/server/guards';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	return json(await loadGamification(requireDb(event.locals), user.id));
};
