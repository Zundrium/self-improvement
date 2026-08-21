import { apiRequest } from '$lib/api';
import type { RewardsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () => apiRequest<RewardsData>('/api/app/rewards');
