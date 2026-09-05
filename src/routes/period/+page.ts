import { apiRequest } from '$lib/api';
import type { PeriodData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ url, depends }) => {
	registerLocalData(depends, 'period');
	return apiRequest<PeriodData>(`/api/app/period${url.search}`);
};
