import { apiRequest } from '$lib/api';
import type { ScreenTimeData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { screenTimeDataWithAppIdentities } from './app-identities';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = async ({ url, depends }) => {
	registerLocalData(depends, 'screen-time');
	const data = await apiRequest<ScreenTimeData>(apiPath(url));
	return screenTimeDataWithAppIdentities(data);
};

function apiPath(url: URL) {
	const params = new URLSearchParams(url.searchParams);
	params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
	return `/api/app/screen-time?${params}`;
}
