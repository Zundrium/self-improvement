import { apiRequest } from '$lib/api';
import type { FitnessData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => apiRequest<FitnessData>(`/api/app/fitness${url.search}`);
