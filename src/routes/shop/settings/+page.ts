import { apiRequest } from '$lib/api';
import type { RewardsData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ depends }) => {
	registerLocalData(depends, 'shop');
	return apiRequest<RewardsData>('/api/app/rewards');
};
