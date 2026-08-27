import { apiRequest } from '$lib/api';
import type { ProfileData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = () => apiRequest<ProfileData>('/api/app/profile');
