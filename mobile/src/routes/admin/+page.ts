import { apiRequest } from '$lib/api';
import type { AdminData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => apiRequest<AdminData>(`/api/app/admin${url.search}`);
