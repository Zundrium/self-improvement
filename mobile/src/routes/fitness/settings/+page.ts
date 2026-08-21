import { apiRequest } from '$lib/api';
import type { ExerciseData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () => apiRequest<ExerciseData>('/api/app/fitness/exercises');
