import { apiRequest } from '$lib/api';
import type { NutritionEntryData } from '$lib/api-types';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) =>
	apiRequest<NutritionEntryData>(`/api/app/nutrition/entry/${params.entryId}`);
