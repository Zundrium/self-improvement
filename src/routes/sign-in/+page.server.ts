import { redirect } from '@sveltejs/kit';
import { safeRedirect } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const redirectTo = safeRedirect(url.searchParams.get('redirect'), '/');
	if (locals.user) redirect(303, redirectTo);
	return { redirectTo };
};
