import { apiRequest } from '$lib/api';
import type { PeriodSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ depends }) => {
	registerLocalData(depends, 'period');
	return apiRequest<PeriodSettingsData>('/api/app/period/settings');
};
