import { registerPlugin } from '@capacitor/core';
import { requireNativeAndroid } from './platform';

const CHECK_INTERVAL_MS = 15 * 60 * 1_000;

export type AndroidUpdate = {
	available: boolean;
	currentVersion: string;
	version: string;
	downloadUrl: string;
};

type InstallOptions = Pick<AndroidUpdate, 'version' | 'downloadUrl'>;

interface AndroidUpdaterPlugin {
	checkLatestRelease(): Promise<AndroidUpdate>;
	install(options: InstallOptions): Promise<void>;
}

const AndroidUpdater = registerPlugin<AndroidUpdaterPlugin>('AndroidUpdater');
let cachedCheck: Promise<AndroidUpdate | null> | null = null;
let cachedAt = 0;

export function loadAvailableAndroidUpdate() {
	requireNativeAndroid();
	if (!cachedCheck || Date.now() - cachedAt >= CHECK_INTERVAL_MS) {
		cachedAt = Date.now();
		cachedCheck = AndroidUpdater.checkLatestRelease()
			.then((update) => (update.available ? update : null))
			.catch(() => null);
	}
	return cachedCheck;
}

export function installAndroidUpdate(options: InstallOptions) {
	requireNativeAndroid();
	return AndroidUpdater.install(options);
}
