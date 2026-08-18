import { redirect } from '@sveltejs/kit';
import { ApiError, apiRequest, refreshCredentialsTimeZone } from '$lib/api';
import type { LayoutData, SessionData } from '$lib/api-types';
import type { LayoutLoad } from './$types';

export const ssr = false;

const PUBLIC_ROUTES = new Set(['/sign-in', '/forgot-password', '/reset-password']);

export const load: LayoutLoad = async ({ url }) => {
	await refreshCredentialsTimeZone();
	if (PUBLIC_ROUTES.has(url.pathname)) return publicSession();
	try {
		return await apiRequest<SessionData>('/api/app/session');
	} catch (cause) {
		if (cause instanceof ApiError && cause.status === 401) {
			redirect(307, `/sign-in?redirect=${encodeURIComponent(url.pathname + url.search)}`);
		}
		throw cause;
	}
};

function publicSession(): LayoutData {
	return { user: null, enabledTrackers: [] };
}
