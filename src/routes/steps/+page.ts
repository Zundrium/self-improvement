import { apiRequest } from '$lib/api';
import type { StepsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ url, depends }) => {
	registerLocalData(depends, 'steps');
	return apiRequest<StepsData>(apiPath(url));
};

function apiPath(url: URL) {
	const params = new URLSearchParams(url.searchParams);
	params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
	return `/api/app/steps?${params}`;
}
