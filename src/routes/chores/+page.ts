import { apiRequest } from '$lib/api';
import type { ChoresData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => apiRequest<ChoresData>(`/api/app/chores${url.search}`);
