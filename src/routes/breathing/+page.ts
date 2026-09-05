import { apiRequest } from '$lib/api';
import type { BreathingData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ url, depends }) => {
	registerLocalData(depends, 'breathing');
	return apiRequest<BreathingData>(`/api/app/breathing${url.search}`);
};
