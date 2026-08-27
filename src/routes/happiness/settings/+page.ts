import { apiRequest } from '$lib/api';
import type { HappinessSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () =>
	apiRequest<HappinessSettingsData>('/api/app/happiness/settings');
