import { mobileRepository, recordAchievementEvents } from '$lib/api';
import { localAppStore } from '$lib/local/state';
import type { AppTrackerId } from '$lib/trackers/registry';
import { TRACKER_IDS, type PermissionState, type TrackerId } from '$domain/model';
import { SyncCoordinator } from '$domain/sync-coordinator';
import { AndroidHealthAdapter } from './health';
import { createNativeTrackerJobs } from './jobs';
import { AndroidUsageAdapter } from './usage';

export const androidHealth = new AndroidHealthAdapter();
export const androidUsage = new AndroidUsageAdapter();
export const androidSyncCoordinator = new SyncCoordinator(
	mobileRepository,
	createNativeTrackerJobs(androidHealth, androidUsage),
	undefined,
	loadEnabledNativeTrackers
);

export async function loadEnabledNativeTrackers(): Promise<TrackerId[]> {
	return enabledNativeTrackerIds(await localAppStore.readEnabledTrackerIds());
}

export function enabledNativeTrackerIds(enabledTrackerIds: readonly AppTrackerId[]) {
	return TRACKER_IDS.filter((tracker) =>
		enabledTrackerIds.includes(tracker === 'screenTime' ? 'screen-time' : tracker)
	);
}

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
