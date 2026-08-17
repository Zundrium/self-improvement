import { redirect } from '@sveltejs/kit';
import { todayIso } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(303, `/nutrition/log/${todayIso()}`);
};
