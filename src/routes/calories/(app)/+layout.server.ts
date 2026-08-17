import { redirect } from '@sveltejs/kit';

import { requireDb, requireUser } from '$lib/server/guards';
import { getProfile } from '../server/profiles';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const user = requireUser(event);
	const profile = await getProfile(requireDb(event.locals), user.id);
	if (!profile) redirect(303, '/calories/onboarding');
	return { user, profile };
};
