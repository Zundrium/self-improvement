import { apiRequest } from '$lib/api';
import type { StepsSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ depends }) => {
	registerLocalData(depends, 'steps');
	return apiRequest<StepsSettingsData>('/api/app/steps/settings');
};
