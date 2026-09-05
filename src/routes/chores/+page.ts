import { apiRequest } from '$lib/api';
import type { ChoresData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ url, depends }) => {
	registerLocalData(depends, 'chores');
	return apiRequest<ChoresData>(`/api/app/chores${url.search}`);
};
