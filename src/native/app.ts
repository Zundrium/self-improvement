import { App } from '@capacitor/app';
import { SyncFailure, validationFailure } from '../domain/errors';
import { payloadAppVersion } from '../domain/payload-validation';
import { requireNativeAndroid } from './platform';

export async function getAppVersion() {
	requireNativeAndroid();
	let version: string;
	try {
		version = (await App.getInfo()).version;
	} catch {
		throw new SyncFailure('native');
	}
	try {
		return payloadAppVersion(version);
	} catch {
		throw validationFailure('The app version could not be read.');
	}
}

export async function listenForResume(listener: () => void | Promise<void>) {
	requireNativeAndroid();
	const handle = await App.addListener('resume', () => {
		void Promise.resolve(listener()).catch(() => undefined);
	});
	return () => void handle.remove();
}
