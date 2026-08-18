import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
	appId: 'com.zuncreative.selfimprovement',
	appName: 'Self Improvement',
	webDir: 'dist-mobile',
	loggingBehavior: 'none',
	...(serverUrl
		? {
				server: {
					url: serverUrl,
					cleartext: serverUrl.startsWith('http://')
				}
			}
		: {})
};

export default config;
