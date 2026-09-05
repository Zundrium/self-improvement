import { apiRequest } from '$lib/api';
import type { GamificationData } from '$lib/api-types';
import { selectedGamificationDate } from '$lib/gamification/dates';
import type { PageLoad } from './$types';
import { registerLocalData } from '$lib/app/resources';

export const load: PageLoad = async ({ url, depends }) => {
	registerLocalData(depends, 'achievements');
	const gamification = await apiRequest<GamificationData>('/api/app/gamification');
	return {
		...gamification,
		date: selectedGamificationDate(url, gamification.today)
	};
};
