import { mobileRepository } from '$lib/api';
import type { ActionFeedItem } from '$lib/api-types';
import type { AppTrackerId } from '$lib/trackers/registry';
import {
	TRACKER_IDS,
	type MobileSyncStatus,
	type PermissionState,
	type TrackerId
} from '$domain/model';
import { checkAndroidPermissions } from './android-data';
import { isNativeAndroid } from './platform';

type NativeActionState = {
	enabledTrackerIds: AppTrackerId[];
	healthAvailable: boolean;
	permissions: Record<TrackerId, PermissionState>;
	status: MobileSyncStatus;
};

export async function loadNativeActionFeedItems(enabledTrackerIds: AppTrackerId[]) {
	if (!isNativeAndroid()) return [];
	const [access, status] = await Promise.all([
		checkAndroidPermissions(),
		mobileRepository.loadStatus()
	]);
	return buildNativeActionFeedItems({
		enabledTrackerIds,
		healthAvailable: access.healthAvailable,
		permissions: access.permissions,
		status
	});
}

export function buildNativeActionFeedItems(state: NativeActionState) {
	const enabled = enabledNativeTrackers(state.enabledTrackerIds);
	const items: ActionFeedItem[] = [];
	const blocked = new Set<TrackerId>();
	addHealthAccessAction(items, blocked, enabled, state);
	addUsageAccessAction(items, blocked, enabled, state.permissions.screenTime);
	addSyncAction(items, blocked, enabled, state.status);
	return items;
}

function addHealthAccessAction(
	items: ActionFeedItem[],
	blocked: Set<TrackerId>,
	enabled: TrackerId[],
	state: NativeActionState
) {
	const trackers = enabled.filter((id) => id !== 'screenTime');
	const missing = trackers.filter((id) => state.permissions[id] !== 'granted');
	if (!missing.length) return;
	missing.forEach((id) => blocked.add(id));
	items.push(
		state.healthAvailable ? healthPermissionAction(missing) : healthUnavailableAction(missing)
	);
}

function addUsageAccessAction(
	items: ActionFeedItem[],
	blocked: Set<TrackerId>,
	enabled: TrackerId[],
	permission: PermissionState
) {
	if (!enabled.includes('screenTime') || permission === 'granted') return;
	blocked.add('screenTime');
	items.push(usagePermissionAction());
}

function addSyncAction(
	items: ActionFeedItem[],
	blocked: Set<TrackerId>,
	enabled: TrackerId[],
	status: MobileSyncStatus
) {
	const failed = enabled.filter(
		(id) => !blocked.has(id) && status.trackers[id].outcome === 'failed'
	);
	if (failed.length) items.push(syncAction(failed));
}

function healthPermissionAction(trackers: Array<'steps' | 'sleep'>): ActionFeedItem {
	return {
		id: 'permission:health-connect',
		trackerIds: trackers,
		priority: 'blocking',
		icon: 'permission',
		title: 'Allow Health Connect access',
		action: { type: 'request-health-access', trackerIds: trackers }
	};
}

function healthUnavailableAction(trackers: Array<'steps' | 'sleep'>): ActionFeedItem {
	return {
		id: 'permission:health-connect-unavailable',
		trackerIds: trackers,
		priority: 'blocking',
		icon: 'permission',
		title: 'Health Connect is unavailable',
		action: { type: 'navigate', href: '/android-data-help' }
	};
}

function usagePermissionAction(): ActionFeedItem {
	return {
		id: 'permission:usage-access',
		trackerIds: ['screen-time'],
		priority: 'blocking',
		icon: 'permission',
		title: 'Allow screen-time access',
		action: { type: 'open-usage-access' }
	};
}

function syncAction(trackers: TrackerId[]): ActionFeedItem {
	return {
		id: 'sync:android-data',
		trackerIds: trackers.map(toAppTrackerId),
		priority: 'blocking',
		icon: 'sync',
		title: `Retry ${trackerNames(trackers)} sync`,
		action: { type: 'sync-android-data', trackerIds: trackers }
	};
}

function enabledNativeTrackers(enabled: AppTrackerId[]) {
	return TRACKER_IDS.filter((id) => enabled.includes(toAppTrackerId(id)));
}

function trackerNames(trackers: TrackerId[]) {
	return trackers.map((id) => (id === 'screenTime' ? 'Screen time' : capitalize(id))).join(' and ');
}

function toAppTrackerId(id: TrackerId): AppTrackerId {
	return id === 'screenTime' ? 'screen-time' : id;
}

function capitalize(value: string) {
	return `${value[0].toUpperCase()}${value.slice(1)}`;
}
