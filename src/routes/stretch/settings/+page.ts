import { apiRequest } from '$lib/api';
import type { StretchSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ depends }) => {
	registerLocalData(depends, 'stretch');
	return apiRequest<StretchSettingsData>('/api/app/stretch/settings');
};
