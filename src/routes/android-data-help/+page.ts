import { redirect } from '@sveltejs/kit';
import { permissionsSettingsHref } from '$lib/permissions';
import type { PageLoad } from './$types';

export const load: PageLoad = () => redirect(307, permissionsSettingsHref());
