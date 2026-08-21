import { mobileRepository } from '$lib/api';
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
	const { available } = await androidHealth.isAvailable();
	const unavailable = Promise.resolve({ state: 'unavailable' as const });
	const [steps, sleep, screenTime] = await Promise.all([
		available ? androidHealth.checkPermission('steps') : unavailable,
		available ? androidHealth.checkPermission('sleep') : unavailable,
		androidUsage.checkPermission()
	]);
	return {
		healthAvailable: available,
		permissions: {
			steps: steps.state,
			sleep: sleep.state,
			screenTime: screenTime.state
		} satisfies Record<'steps' | 'sleep' | 'screenTime', PermissionState>
	};
}
