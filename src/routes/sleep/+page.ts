import { apiRequest } from '$lib/api';
import type { SleepData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = async ({ url, depends }) => {
	registerLocalData(depends, 'sleep');
	const params = new URLSearchParams(url.searchParams);
	params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
	const data = await apiRequest<SleepData>(`/api/app/sleep?${params}`);
	return {
		bedtime: data.settings.bedtime,
		date: data.date,
		today: data.today,
		progressDays: data.progressDays,
		trackedDates: data.days.filter((day) => day.status !== 'pending').map((day) => day.localDate)
	};
};
