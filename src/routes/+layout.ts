import { redirect } from '@sveltejs/kit';
import { apiRequest, recordAchievementEvents } from '$lib/api';
import type { AppBootstrapData } from '$lib/api-types';
import { ANDROID_SETUP_PATH, androidSetupRepository } from '$native/android-setup';
import { isNativeAndroid } from '$native/platform';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = async ({ url }) => {
	await enforceAndroidSetup(url.pathname);
	return apiRequest<AppBootstrapData>('/api/app/bootstrap');
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
