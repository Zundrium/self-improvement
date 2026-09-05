import { apiRequest } from '$lib/api';
import type { ProfileData } from '$lib/api-types';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = ({ depends }) => {
	registerLocalData(depends, 'nutrition');
	return apiRequest<ProfileData>('/api/app/profile');
};
