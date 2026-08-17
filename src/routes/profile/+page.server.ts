import { requireUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => ({
	profileUser: requireUser(event)
});
