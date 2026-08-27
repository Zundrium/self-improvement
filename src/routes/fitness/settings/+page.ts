import { apiRequest } from '$lib/api';
import type { ExerciseData, FitnessSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const [exerciseData, settings] = await Promise.all([
		apiRequest<ExerciseData>('/api/app/fitness/exercises'),
		apiRequest<FitnessSettingsData>('/api/app/fitness/settings')
	]);
	return { ...exerciseData, settings };
};
