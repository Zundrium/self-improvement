import { apiRequest } from '$lib/api';
import type { SleepData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => apiRequest<SleepData>(apiPath(url));

function apiPath(url: URL) {
	const params = new URLSearchParams(url.searchParams);
	params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
	return `/api/app/sleep?${params}`;
}
