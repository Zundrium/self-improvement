import { apiRequest } from '$lib/api';
import type { RewardsData } from '$lib/api-types';
import { selectedGamificationDate } from '$lib/gamification/dates';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const rewards = await apiRequest<RewardsData>('/api/app/rewards');
	return { ...rewards, date: selectedGamificationDate(url, rewards.today) };
};
