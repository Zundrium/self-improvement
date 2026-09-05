import { apiRequest } from '$lib/api';
import type { MeditationData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ url, depends }) => {
	registerLocalData(depends, 'meditation');
	return apiRequest<MeditationData>(`/api/app/meditation${url.search}`);
};
