import { appMaintenance } from '$lib/app/maintenance';
import { mobileRepository } from '$lib/api';
import { localAppStore } from '$lib/local/state';
import type { AppTrackerId } from '$lib/trackers/registry';
import { TRACKER_IDS, type PermissionState, type TrackerId } from '$domain/model';
import { SyncCoordinator } from '$domain/sync-coordinator';
import { AndroidHealthAdapter } from './health';
import { createNativeTrackerJobs } from './jobs';
import { AndroidUsageAdapter } from './usage';

export const androidHealth = new AndroidHealthAdapter();
export const androidUsage = new AndroidUsageAdapter();
const coordinator = new SyncCoordinator(
	mobileRepository,
	createNativeTrackerJobs(androidHealth, androidUsage),
	undefined,
	loadEnabledNativeTrackers
);

export const androidSyncCoordinator = {
	sync: (trackers: readonly TrackerId[], now?: Date) =>
		appMaintenance.run(() => coordinator.sync(trackers, now)),
	syncAll: () => appMaintenance.run(() => coordinator.syncAll()),
	syncStale: (staleAfterMs?: number) =>
		appMaintenance.run(() => coordinator.syncStale(staleAfterMs))
};

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
	return { healthAvailable: available, permissions };
}
