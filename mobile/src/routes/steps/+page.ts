import { apiRequest } from '$lib/api';
import type { StepsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => apiRequest<StepsData>(apiPath(url));

function apiPath(url: URL) {
	const params = new URLSearchParams(url.searchParams);
	params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
	return `/api/app/steps?${params}`;
}
