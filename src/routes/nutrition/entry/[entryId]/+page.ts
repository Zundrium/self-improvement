import { localOperation } from '$lib/api';
import type { PageLoad } from './$types';
import { APP_RESOURCES, registerResources } from '$lib/app/resources';

export const load: PageLoad = ({ params, depends }) => {
	registerResources(depends, APP_RESOURCES.local, APP_RESOURCES.tracker('nutrition'));
	return localOperation('nutritionEntry', { entryId: params.entryId });
};
