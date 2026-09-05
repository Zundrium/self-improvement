import { apiRequest } from '$lib/api';
import type { StretchData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ url, depends }) => {
	registerLocalData(depends, 'stretch');
	return apiRequest<StretchData>(`/api/app/stretch${url.search}`);
};
