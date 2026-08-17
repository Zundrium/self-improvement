import { redirect } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { getProfile } from './server/profiles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const profile = await getProfile(requireDb(event.locals), user.id);
	redirect(303, profile ? '/nutrition/log/today' : '/nutrition/onboarding');
};
