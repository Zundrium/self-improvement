import { SyncFailure, classifyFailure } from './errors';
import {
	TRACKER_IDS,
	type MobileSyncStatus,
	type SyncContext,
	type PermissionCheck,
	type PermissionState,
	type SyncReport,
	type TrackerId,
	type TrackerSyncResult
} from './model';
import { reportOverall, staleTrackerIds } from './status';
import type { MobileRepository } from '../native/secure-repository';

export const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;

export interface TrackerJob {
	checkPermission(): Promise<PermissionCheck>;
	collect(context: SyncContext, now: Date): Promise<unknown>;
	process(context: SyncContext, payload: unknown): Promise<void>;
}

export class SyncCoordinator {
	private activeSync?: Promise<SyncReport>;

	constructor(
		private readonly repository: MobileRepository,
		private readonly jobs: Record<TrackerId, TrackerJob>,
		private readonly clock: () => Date = () => new Date(),
		private readonly loadEnabledTrackers: () => Promise<readonly TrackerId[]> = async () =>
			TRACKER_IDS
	) {}

	syncAll() {
		return this.sync(TRACKER_IDS);
	}

	syncStale(staleAfterMs = DEFAULT_STALE_AFTER_MS) {
		const now = this.clock();
		return this.startSync(async () => {
			const [status, enabled] = await Promise.all([
				this.repository.loadStatus(),
				this.loadEnabledTrackers()
			]);
			return this.performSync(
				filterEnabled(staleTrackerIds(status, now, staleAfterMs), enabled),
				now
			);
		});
	}

	sync(trackers: readonly TrackerId[], now = this.clock()) {
		return this.startSync(async () => {
			const enabled = await this.loadEnabledTrackers();
			return this.performSync(filterEnabled(trackers, enabled), now);
		});
	}

	private startSync(operation: () => Promise<SyncReport>) {
		if (this.activeSync) return this.activeSync;
		const sync = operation();
		this.activeSync = sync;
		void sync
			.finally(() => {
				if (this.activeSync === sync) this.activeSync = undefined;
			})
			.catch(() => undefined);
		return sync;
	}

	private async performSync(trackers: TrackerId[], now: Date) {
		if (!trackers.length) return emptyReport();
		const status = await this.repository.loadStatus();
		const results = await this.resultsForTrackers(trackers, now);
		await this.repository.saveStatus(applyResults(status, results, now));
		return { overall: reportOverall(results), results } as SyncReport;
	}

	private async resultsForTrackers(trackers: TrackerId[], now: Date) {
		try {
			const context = await this.repository.loadSyncContext();
			return await Promise.all(trackers.map((tracker) => this.runTracker(tracker, context, now)));
		} catch (cause) {
			return trackerFailures(trackers, cause);
		}
	}

	private async runTracker(tracker: TrackerId, context: SyncContext, now: Date) {
		let permission: PermissionState = 'unknown';
		try {
			const check = await this.jobs[tracker].checkPermission();
			permission = check.state;
			if (permission !== 'granted') throw permissionFailure(permission);
			const payload = await this.jobs[tracker].collect(context, now);
			await this.jobs[tracker].process(context, payload);
			return successResult(tracker, permission, now);
		} catch (cause) {
			return failedResult(tracker, permission, cause);
		}
	}
}

function applyResults(
	status: MobileSyncStatus,
	results: TrackerSyncResult[],
	now: Date
): MobileSyncStatus {
	const next = copyStatus(status);
	for (const result of results) {
		const previous = status.trackers[result.tracker];
		next.trackers[result.tracker] = resultStatus(previous, result, now);
	}
	return next;
}

function resultStatus(
	previous: MobileSyncStatus['trackers'][TrackerId],
	result: TrackerSyncResult,
	now: Date
) {
	const attempt = { permission: result.permission, lastAttemptAt: now.toISOString() };
	if (result.outcome === 'success') {
		return { ...attempt, outcome: 'success' as const, lastSuccessAt: result.completedAt };
	}
	return { ...previous, ...attempt, outcome: 'failed' as const, failure: result.failure };
}

function copyStatus(status: MobileSyncStatus): MobileSyncStatus {
	return {
		version: 2,
		trackers: {
			steps: { ...status.trackers.steps },
			sleep: { ...status.trackers.sleep },
			screenTime: { ...status.trackers.screenTime }
		}
	};
}

function successResult(tracker: TrackerId, permission: PermissionState, now: Date) {
	return {
		tracker,
		outcome: 'success' as const,
		completedAt: now.toISOString(),
		permission
	};
}

function failedResult(tracker: TrackerId, permission: PermissionState, cause: unknown) {
	return { tracker, outcome: 'failed' as const, permission, failure: classifyFailure(cause) };
}

function trackerFailures(trackers: TrackerId[], cause: unknown) {
	return trackers.map((tracker) => failedResult(tracker, 'unknown', cause));
}

function permissionFailure(state: PermissionState) {
	const message =
		state === 'unavailable'
			? 'The Android data source is unavailable on this device.'
			: 'Android permission is required before this tracker can be processed.';
	return new SyncFailure('permission', message);
}

function filterEnabled(trackers: readonly TrackerId[], enabled: readonly TrackerId[]) {
	const enabledTrackers = new Set(enabled);
	return [...new Set(trackers)].filter((tracker) => enabledTrackers.has(tracker));
}

function emptyReport(): SyncReport {
	return { overall: 'idle', results: [] };
}
