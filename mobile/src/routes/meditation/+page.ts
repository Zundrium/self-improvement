import { apiRequest } from '$lib/api';
import type { MeditationData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) =>
	apiRequest<MeditationData>(`/api/app/meditation${url.search}`);
