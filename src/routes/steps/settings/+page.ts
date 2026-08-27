import { apiRequest } from '$lib/api';
import type { StepsSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () => apiRequest<StepsSettingsData>('/api/app/steps/settings');
