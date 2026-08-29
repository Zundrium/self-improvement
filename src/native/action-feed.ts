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
import { loadAvailableAndroidUpdate, type AndroidUpdate } from './android-updater';
import { isNativeAndroid } from './platform';

type NativeActionState = {
	enabledTrackerIds: AppTrackerId[];
	healthAvailable: boolean;
	permissions: Record<TrackerId, PermissionState>;
	status: MobileSyncStatus;
	update?: AndroidUpdate | null;
};

export async function loadNativeActionFeedItems(enabledTrackerIds: AppTrackerId[]) {
	if (!isNativeAndroid()) return [];
	const [access, status, update] = await Promise.all([
		checkAndroidPermissions(),
		mobileRepository.loadStatus(),
		loadAvailableAndroidUpdate()
	]);
	return buildNativeActionFeedItems({
		enabledTrackerIds,
		healthAvailable: access.healthAvailable,
		permissions: access.permissions,
		status,
		update
	});
}

export function buildNativeActionFeedItems(state: NativeActionState) {
	const enabled = enabledNativeTrackers(state.enabledTrackerIds);
	const items: ActionFeedItem[] = [];
	const blocked = new Set<TrackerId>();
	addUpdateAction(items, state.update);
	addHealthAccessAction(items, blocked, enabled, state);
	addUsageAccessAction(items, blocked, enabled, state.permissions.sleep);
	addSyncAction(items, blocked, enabled, state.status);
	return items;
}

function addUpdateAction(items: ActionFeedItem[], update: AndroidUpdate | null | undefined) {
	if (!update?.available) return;
	items.push({
		id: `update:${update.version}`,
		trackerIds: [],
		priority: 'warning',
		icon: 'update',
		title: `Update to ${update.version}`,
		reason: 'A new signed version is ready to install.',
		action: {
			type: 'install-android-update',
			version: update.version,
			downloadUrl: update.downloadUrl
		}
	});
}

function addHealthAccessAction(
	items: ActionFeedItem[],
	blocked: Set<TrackerId>,
	enabled: TrackerId[],
	state: NativeActionState
) {
	if (!enabled.includes('steps') || state.permissions.steps === 'granted') return;
	blocked.add('steps');
	items.push(state.healthAvailable ? healthPermissionAction() : healthUnavailableAction());
}

function addUsageAccessAction(
	items: ActionFeedItem[],
	blocked: Set<TrackerId>,
	enabled: TrackerId[],
	permission: PermissionState
) {
	const trackers = enabled.filter((id) => id === 'sleep' || id === 'screenTime');
	if (!trackers.length || permission === 'granted') return;
	trackers.forEach((id) => blocked.add(id));
	items.push(usagePermissionAction(trackers));
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

function healthPermissionAction(): ActionFeedItem {
	return {
		id: 'permission:health-connect',
		trackerIds: ['steps'],
		priority: 'blocking',
		icon: 'permission',
		title: 'Allow Health Connect access',
		action: { type: 'request-health-access', trackerIds: ['steps'] }
	};
}

function healthUnavailableAction(): ActionFeedItem {
	return {
		id: 'permission:health-connect-unavailable',
		trackerIds: ['steps'],
		priority: 'blocking',
		icon: 'permission',
		title: 'Health Connect is unavailable',
		action: { type: 'navigate', href: '/android-data-help' }
	};
}

function usagePermissionAction(trackers: TrackerId[]): ActionFeedItem {
	return {
		id: 'permission:usage-access',
		trackerIds: trackers.map(toAppTrackerId),
		priority: 'blocking',
		icon: 'permission',
		title:
			trackers.length > 1
				? 'Allow bedtime and screen-time access'
				: `Allow ${trackerNames(trackers)} access`,
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
