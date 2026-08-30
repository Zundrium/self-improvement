import { dev } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import type { ClientInit } from '@sveltejs/kit';

export const init: ClientInit = async () => {
	if (!dev) return;
	if (!Capacitor.isNativePlatform()) {
		document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px');
	}
	const { default: eruda } = await import('eruda');
	eruda.init();
};
