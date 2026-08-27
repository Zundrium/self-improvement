import { apiRequest } from '$lib/api';
import type { BreathingData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) =>
	apiRequest<BreathingData>(`/api/app/breathing${url.search}`);
