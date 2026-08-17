import { redirect } from '@sveltejs/kit';

import { requireUser } from '$lib/server/guards';
import { todayIso } from '$lib/utils';
import { validDate } from '../../server/nutrition';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireUser(event);
	const date = event.url.searchParams.get('date') ?? todayIso();
	if (!validDate(date) || date > todayIso()) redirect(303, '/nutrition/log/today');
	return { date };
};
