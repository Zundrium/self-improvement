import { apiRequest } from '$lib/api';
import type { DashboardData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => ({
	dashboard: await apiRequest<DashboardData>(`/api/app/dashboard${url.search}`)
});
