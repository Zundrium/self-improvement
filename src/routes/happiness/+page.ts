import { apiRequest } from '$lib/api';
import type { HappinessData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ url, depends }) => {
	registerLocalData(depends, 'happiness');
	return apiRequest<HappinessData>(`/api/app/happiness${url.search}`);
};
