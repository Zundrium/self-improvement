import { dev } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import type { ClientInit } from '@sveltejs/kit';

export const init: ClientInit = () => {
	if (!dev || Capacitor.isNativePlatform()) return;
	document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px');
};
