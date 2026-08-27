import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.zuncreative.selfimprovement',
	appName: 'Self Improvement',
	webDir: 'dist-mobile',
	loggingBehavior: 'none',
	server: { androidScheme: 'https' }
};

export default config;
