import { redirect } from '@sveltejs/kit';
import { ApiError, apiRequest } from '$lib/api';
import type { NutritionLogData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		return await apiRequest<NutritionLogData>(`/api/app/nutrition/log/${params.date}`);
	} catch (cause) {
		if (cause instanceof ApiError && cause.status === 409) redirect(307, '/nutrition/onboarding');
		throw cause;
	}
};
