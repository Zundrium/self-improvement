import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
	appId: 'com.zuncreative.selfimprovement',
	appName: 'Self Improvement',
	webDir: 'dist-mobile',
	loggingBehavior: 'none',
	server: { androidScheme: 'https' },
	...(serverUrl
		? {
				server: {
					url: serverUrl,
					androidScheme: serverUrl.startsWith('https://') ? 'https' : 'http',
					cleartext: serverUrl.startsWith('http://')
				}
			}
		: {})
};

export default config;
