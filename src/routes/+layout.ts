import { error, isRedirect, redirect } from '@sveltejs/kit';
import { apiRequest, recordAchievementEvents } from '$lib/api';
import { initializationErrorMessage } from '$lib/local/initialization-error';
import type { AppBootstrapData } from '$lib/api-types';
import { ANDROID_SETUP_PATH, androidSetupRepository } from '$native/android-setup';
import { isNativeAndroid } from '$native/platform';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = async ({ url }) => {
	try {
		await enforceAndroidSetup(url.pathname);
		return await apiRequest<AppBootstrapData>('/api/app/bootstrap');
	} catch (cause) {
		if (isRedirect(cause)) throw cause;
		error(500, initializationErrorMessage(cause));
	}
};

async function enforceAndroidSetup(pathname: string) {
	if (!isNativeAndroid()) {
		if (pathname === ANDROID_SETUP_PATH) redirect(307, '/');
		return;
	}
	const completed = await androidSetupRepository.isCompleted();
	if (!completed && pathname !== ANDROID_SETUP_PATH) redirect(307, ANDROID_SETUP_PATH);
	if (completed) await recordAchievementEvents('setup-android-complete');
	if (completed && pathname === ANDROID_SETUP_PATH) redirect(307, '/');
}
