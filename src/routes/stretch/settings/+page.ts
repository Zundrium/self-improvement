import { apiRequest } from '$lib/api';
import type { StretchSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () => apiRequest<StretchSettingsData>('/api/app/stretch/settings');
