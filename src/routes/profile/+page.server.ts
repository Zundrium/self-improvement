import { fail } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import {
	estimatedTdee,
	getProfile,
	profileInputFromForm,
	saveProfile
} from '../calories/server/profiles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const profileUser = requireUser(event);
	const nutritionProfile = await getProfile(requireDb(event.locals), profileUser.id);
	return {
		profileUser,
		nutritionProfile,
		estimatedTdee: estimatedTdee(nutritionProfile)
	};
};

export const actions: Actions = {
	nutrition: async (event) => {
		const user = requireUser(event);
		try {
			const input = profileInputFromForm(await event.request.formData());
			await saveProfile(requireDb(event.locals), user.id, input);
			return { form: 'nutrition', message: 'Nutrition profile updated.' };
		} catch (cause) {
			return fail(400, {
				form: 'nutrition',
				error: cause instanceof Error ? cause.message : 'Could not save your nutrition profile.'
			});
		}
	}
};
