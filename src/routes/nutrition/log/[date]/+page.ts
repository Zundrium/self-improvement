import { redirect } from '@sveltejs/kit';
import { ApiError, localOperation } from '$lib/api';
import type { PageLoad } from './$types';
import { APP_RESOURCES, registerResources } from '$lib/app/resources';

export const load: PageLoad = async ({ params, depends }) => {
	registerResources(depends, APP_RESOURCES.local, APP_RESOURCES.tracker('nutrition'));
	try {
		return await localOperation('nutritionLog', { date: params.date });
	} catch (cause) {
		if (cause instanceof ApiError && cause.status === 409) redirect(307, '/nutrition/onboarding');
		throw cause;
	}
};
