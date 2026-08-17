import { fail, redirect } from '@sveltejs/kit';

import { requireDb, requireUser } from '$lib/server/guards';
import { getProfile, profileInputFromForm, saveProfile } from '../server/profiles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	if (await getProfile(requireDb(event.locals), user.id)) redirect(303, '/calories/log/today');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUser(event);
		try {
			const input = profileInputFromForm(await event.request.formData());
			await saveProfile(requireDb(event.locals), user.id, { ...input, goalMode: 'estimated' });
		} catch (cause) {
			return fail(400, {
				error: cause instanceof Error ? cause.message : 'Could not save your profile.'
			});
		}
		redirect(303, '/calories/log/today');
	}
};
