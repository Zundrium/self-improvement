import { apiRequest } from '$lib/api';
import type { BreathingSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () =>
	apiRequest<BreathingSettingsData>('/api/app/breathing/settings');
