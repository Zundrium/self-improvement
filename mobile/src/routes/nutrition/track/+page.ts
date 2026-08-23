import { redirect } from '@sveltejs/kit';
import { apiRequest } from '$lib/api';
import type { NutritionFastingStatusData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const today = new Date().toISOString().slice(0, 10);
	const date = url.searchParams.get('date') ?? today;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) {
		redirect(307, `/nutrition/log/${today}`);
	}
	const status = await apiRequest<NutritionFastingStatusData>(`/api/app/nutrition/fasting/${date}`);
	if (status.fasting) redirect(307, `/nutrition/log/${date}`);
	return { date };
};
