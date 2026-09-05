import { apiRequest } from '$lib/api';
import type { RewardsData } from '$lib/api-types';
import { selectedGamificationDate } from '$lib/gamification/dates';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = async ({ url, depends }) => {
	registerLocalData(depends, 'shop');
	const rewards = await apiRequest<RewardsData>('/api/app/rewards');
	return { ...rewards, date: selectedGamificationDate(url, rewards.today) };
};
