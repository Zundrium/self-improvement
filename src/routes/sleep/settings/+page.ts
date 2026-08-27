import { apiRequest } from '$lib/api';
import type { SleepData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const data = await apiRequest<SleepData>(
		`/api/app/sleep?timeZone=${encodeURIComponent(timeZone)}`
	);
	return { settings: data.settings };
};
