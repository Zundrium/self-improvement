import { apiRequest } from '$lib/api';
import type { HappinessSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ depends }) => {
	registerLocalData(depends, 'happiness');
	return apiRequest<HappinessSettingsData>('/api/app/happiness/settings');
};
