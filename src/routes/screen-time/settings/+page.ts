import { apiRequest } from '$lib/api';
import type { ScreenTimeData, ScreenTimeSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { screenTimeDataWithAppIdentities } from '../app-identities';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = async ({ url, depends }) => {
	registerLocalData(depends, 'screen-time');
	const [settings, screenTime] = await Promise.all([
		apiRequest<ScreenTimeSettingsData>('/api/app/screen-time/settings'),
		apiRequest<ScreenTimeData>(screenTimePath(url))
	]);
	const data = await screenTimeDataWithAppIdentities(screenTime);
	return { settings, apps: data.usage.apps, knownApps: data.knownApps };
};

function screenTimePath(url: URL) {
	const params = new URLSearchParams(url.searchParams);
	params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
	return `/api/app/screen-time?${params}`;
}
