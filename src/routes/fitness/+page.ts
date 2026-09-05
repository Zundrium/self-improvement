import { apiRequest } from '$lib/api';
import type { FitnessData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ url, depends }) => {
	registerLocalData(depends, 'fitness');
	return apiRequest<FitnessData>(`/api/app/fitness${url.search}`);
};
