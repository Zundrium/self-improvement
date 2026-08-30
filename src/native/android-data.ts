import { mobileRepository, recordAchievementEvents } from '$lib/api';
import type { PermissionState } from '$domain/model';
import { SyncCoordinator } from '$domain/sync-coordinator';
import { AndroidHealthAdapter } from './health';
import { createNativeTrackerJobs } from './jobs';
import { AndroidUsageAdapter } from './usage';

export const androidHealth = new AndroidHealthAdapter();
export const androidUsage = new AndroidUsageAdapter();
export const androidSyncCoordinator = new SyncCoordinator(
	mobileRepository,
	createNativeTrackerJobs(androidHealth, androidUsage)
);

export async function checkAndroidPermissions() {
	const [{ available }, usage] = await Promise.all([
		androidHealth.isAvailable(),
		androidUsage.checkPermission()
	]);
	const steps = available
		? await androidHealth.checkPermission()
		: ({ state: 'unavailable' } as const);
	const permissions = {
		steps: steps.state,
		sleep: usage.state,
		screenTime: usage.state
	} satisfies Record<'steps' | 'sleep' | 'screenTime', PermissionState>;
	const achievements = [
		...(permissions.steps === 'granted' ? ['setup-steps-health-connect'] : []),
		...(permissions.sleep === 'granted' ? ['setup-usage-access-granted'] : []),
		...(permissions.steps === 'granted' && permissions.sleep === 'granted'
			? ['setup-all-native-connections']
			: [])
	];
	await recordAchievementEvents(...achievements);
	return { healthAvailable: available, permissions };
}
