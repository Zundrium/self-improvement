import { getEnabledTrackers } from '$lib/server/trackers/preferences';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
	user: locals.user,
	enabledTrackers:
		locals.user && locals.db ? await getEnabledTrackers(locals.db, locals.user.id) : []
});
