import { apiRequest } from '$lib/api';
import type { ProfileData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const profile = await apiRequest<ProfileData>('/api/app/profile');
	return { goal: profile.sleepGoalMinutes };
};
