import { redirect } from '@sveltejs/kit';
import { localOperation } from '$lib/api';
import { isValidCalendarDate, todayIso } from '$lib/utils';
import type { PageLoad } from './$types';
import { APP_RESOURCES, registerResources } from '$lib/app/resources';

export const load: PageLoad = async ({ url, depends }) => {
	registerResources(depends, APP_RESOURCES.local, APP_RESOURCES.tracker('nutrition'));
	const today = todayIso();
	const date = url.searchParams.get('date') ?? today;
	if (!isValidCalendarDate(date) || date > today) {
		redirect(307, `/nutrition/log/${today}`);
	}
	const status = await localOperation('nutritionFastingStatus', { date });
	if (status.fasting) redirect(307, `/nutrition/log/${date}`);
	return { date };
};
