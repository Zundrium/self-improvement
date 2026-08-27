import { apiRequest } from '$lib/api';
import type { PeriodData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => apiRequest<PeriodData>(`/api/app/period${url.search}`);
