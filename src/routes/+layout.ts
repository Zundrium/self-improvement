import { isRedirect, redirect } from '@sveltejs/kit';
import { apiRequest } from '$lib/api';
import { initializationErrorMessage } from '$lib/local/initialization-error';
import type { AppBootstrapData } from '$lib/api-types';
import { ANDROID_SETUP_PATH, androidSetupRepository } from '$native/android-setup';
import { isNativeAndroid } from '$native/platform';
import type { LayoutLoad } from './$types';
import { APP_RESOURCES, registerResources } from '$lib/app/resources';

export const ssr = false;

export const load: LayoutLoad = async ({ url, depends }) => {
	registerResources(
		depends,
		APP_RESOURCES.bootstrap,
		APP_RESOURCES.local,
		APP_RESOURCES.gamification,
		APP_RESOURCES.profile
	);
	try {
		await enforceAndroidSetup(url.pathname);
		return await apiRequest<AppBootstrapData>('/api/app/bootstrap');
	} catch (cause) {
		if (isRedirect(cause)) throw cause;
		// This remains outside the database-dependent shell so a retry is always reachable.
		return { startupError: initializationErrorMessage(cause) };
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
