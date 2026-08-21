import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { requireNativeAndroid } from './platform';

export const ANDROID_SETUP_PATH = '/android-setup';
const COMPLETED_KEY = 'self-improvement-android-setup-v1';

class AndroidSetupRepository {
	async isCompleted() {
		requireNativeAndroid();
		return (await SecureStorage.getItem(COMPLETED_KEY)) === 'completed';
	}

	async complete() {
		requireNativeAndroid();
		await SecureStorage.setItem(COMPLETED_KEY, 'completed');
	}
}

export const androidSetupRepository = new AndroidSetupRepository();
