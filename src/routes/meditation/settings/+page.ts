import { apiRequest } from '$lib/api';
import type { MeditationSettingsData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () =>
	apiRequest<MeditationSettingsData>('/api/app/meditation/settings');
