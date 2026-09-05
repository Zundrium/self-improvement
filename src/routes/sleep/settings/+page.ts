import { apiRequest } from '$lib/api';
import type { SleepData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = async ({ depends }) => {
	registerLocalData(depends, 'sleep');
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const data = await apiRequest<SleepData>(
		`/api/app/sleep?timeZone=${encodeURIComponent(timeZone)}`
	);
	return { settings: data.settings };
};
