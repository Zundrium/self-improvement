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
	const [{ available }, usage] = await Promise.all([
		androidHealth.isAvailable(),
		androidUsage.checkPermission()
	]);
	const steps = available
		? await androidHealth.checkPermission()
		: ({ state: 'unavailable' } as const);
	return {
		healthAvailable: available,
		permissions: {
			steps: steps.state,
			sleep: usage.state,
			screenTime: usage.state
		} satisfies Record<'steps' | 'sleep' | 'screenTime', PermissionState>
	};
}
