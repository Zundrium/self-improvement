import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireUser(event);
	redirect(303, '/nutrition/log/today');
};
