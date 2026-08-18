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
		throw new SyncFailure('server');
	}
	try {
		return payloadAppVersion(version);
	} catch {
		throw validationFailure('The app version could not be read.');
	}
}

export async function listenForResume(listener: () => void | Promise<void>) {
	requireNativeAndroid();
	const handle = await App.addListener('resume', () => void listener());
	return () => void handle.remove();
}

export async function getLaunchUrl() {
	requireNativeAndroid();
	const launch = await App.getLaunchUrl();
	if (!launch?.url) return null;
	try {
		return new URL(launch.url);
	} catch {
		return null;
	}
}

export async function listenForAppUrls(listener: (url: URL) => void | Promise<void>) {
	requireNativeAndroid();
	const handle = await App.addListener('appUrlOpen', ({ url }) => {
		try {
			void listener(new URL(url));
		} catch {
			return;
		}
	});
	return () => void handle.remove();
}
