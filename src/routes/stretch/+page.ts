import { apiRequest } from '$lib/api';
import type { StretchData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => apiRequest<StretchData>(`/api/app/stretch${url.search}`);
