import { apiRequest } from '$lib/api';
import type { BreathingSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ depends }) => {
	registerLocalData(depends, 'breathing');
	return apiRequest<BreathingSettingsData>('/api/app/breathing/settings');
};
