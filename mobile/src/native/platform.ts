import { Capacitor } from '@capacitor/core';
import { SyncFailure } from '../domain/errors';

export function isNativeAndroid() {
	return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function requireNativeAndroid() {
	if (!isNativeAndroid()) {
		throw new SyncFailure(
			'pairing',
			'This companion only stores data inside the native Android app.',
			false
		);
	}
}
