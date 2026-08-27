import { apiRequest } from '$lib/api';
import type { PeriodSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () => apiRequest<PeriodSettingsData>('/api/app/period/settings');
