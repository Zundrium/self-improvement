import { apiRequest } from '$lib/api';
import type { MeditationSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ depends }) => {
	registerLocalData(depends, 'meditation');
	return apiRequest<MeditationSettingsData>('/api/app/meditation/settings');
};
