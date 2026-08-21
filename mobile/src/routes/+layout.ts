import { redirect } from '@sveltejs/kit';
import { ApiError, apiRequest, refreshCredentialsTimeZone } from '$lib/api';
import type { LayoutData, SessionData } from '$lib/api-types';
import { ANDROID_SETUP_PATH, androidSetupRepository } from '$native/android-setup';
import { isNativeAndroid } from '$native/platform';
import type { LayoutLoad } from './$types';

export const ssr = false;

const PUBLIC_ROUTES = new Set(['/sign-in', '/forgot-password', '/reset-password']);

export const load: LayoutLoad = async ({ url }) => {
	await refreshCredentialsTimeZone();
	if (PUBLIC_ROUTES.has(url.pathname)) return publicSession();
	try {
		const session = await apiRequest<SessionData>('/api/app/session');
		await enforceAndroidSetup(url.pathname);
		return session;
	} catch (cause) {
		if (cause instanceof ApiError && cause.status === 401) {
			redirect(307, `/sign-in?redirect=${encodeURIComponent(url.pathname + url.search)}`);
		}
		throw cause;
	}
};

async function enforceAndroidSetup(pathname: string) {
	if (!isNativeAndroid()) {
		if (pathname === ANDROID_SETUP_PATH) redirect(307, '/');
		return;
	}
	const completed = await androidSetupRepository.isCompleted();
	if (!completed && pathname !== ANDROID_SETUP_PATH) redirect(307, ANDROID_SETUP_PATH);
	if (completed && pathname === ANDROID_SETUP_PATH) redirect(307, '/');
}

function publicSession(): LayoutData {
	return { user: null, enabledTrackers: [], gamification: null };
}
