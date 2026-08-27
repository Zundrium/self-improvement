import { registerPlugin } from '@capacitor/core';
import { requireNativeAndroid } from './platform';

type AndroidSettingsPlugin = {
	openAppDetails(): Promise<void>;
};

const AndroidSettings = registerPlugin<AndroidSettingsPlugin>('AndroidSettings');

export async function openAndroidAppDetails() {
	requireNativeAndroid();
	await AndroidSettings.openAppDetails();
}
