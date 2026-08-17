import { fail } from '@sveltejs/kit';
import { requireDb, requireUser } from '$lib/server/guards';
import { getTrackerPreferences, saveTrackerPreferences } from '$lib/server/trackers/preferences';
import { isTrackerId, type TrackerId } from '$lib/trackers/registry';
import {
	estimatedTdee,
	getProfile,
	profileInputFromForm,
	saveProfile
} from '../(trackers)/nutrition/server/profiles';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const profileUser = requireUser(event);
	const db = requireDb(event.locals);
	const [nutritionProfile, trackerPreferences] = await Promise.all([
		getProfile(db, profileUser.id),
		getTrackerPreferences(db, profileUser.id)
	]);
	return {
		profileUser,
		nutritionProfile,
		trackerPreferences,
		estimatedTdee: estimatedTdee(nutritionProfile)
	};
};

export const actions: Actions = {
	trackers: async (event) => {
		const user = requireUser(event);
		const enabledIds = trackerIdsFromForm(await event.request.formData());
		await saveTrackerPreferences(requireDb(event.locals), user.id, enabledIds);
		return { form: 'trackers', message: 'Tracker visibility updated.' };
	},
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

function trackerIdsFromForm(form: FormData) {
	return new Set(
		form
			.getAll('trackers')
			.map(String)
			.filter((value): value is TrackerId => isTrackerId(value))
	);
}
