import { apiRequest } from '$lib/api';
import type { HappinessData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) =>
	apiRequest<HappinessData>(`/api/app/happiness${url.search}`);
