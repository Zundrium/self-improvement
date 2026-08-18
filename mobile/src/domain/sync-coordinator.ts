import { SyncFailure, classifyFailure } from './errors';
import {
	TRACKER_IDS,
	type CompanionStatus,
	type PairingCredentials,
	type PermissionCheck,
	type PermissionState,
	type SyncReport,
	type TrackerId,
	type TrackerSyncResult
} from './model';
import { reportOverall, staleTrackerIds } from './status';
import type { CompanionRepository } from '../native/secure-repository';

export const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;

export interface TrackerJob {
	checkPermission(): Promise<PermissionCheck>;
	collect(pairing: PairingCredentials, now: Date): Promise<unknown>;
	upload(pairing: PairingCredentials, payload: unknown): Promise<void>;
}

export class SyncCoordinator {
	private activeSync?: Promise<SyncReport>;

	constructor(
		private readonly repository: CompanionRepository,
		private readonly jobs: Record<TrackerId, TrackerJob>,
		private readonly clock: () => Date = () => new Date()
	) {}

	syncAll() {
		return this.sync(TRACKER_IDS);
	}

	async syncStale(staleAfterMs = DEFAULT_STALE_AFTER_MS) {
		const now = this.clock();
		const status = await this.repository.loadStatus();
		return this.sync(staleTrackerIds(status, now, staleAfterMs), now);
	}

	async sync(trackers: readonly TrackerId[], now = this.clock()) {
		if (this.activeSync) return this.activeSync;
		this.activeSync = this.performSync(uniqueTrackers(trackers), now);
		try {
			return await this.activeSync;
		} finally {
			this.activeSync = undefined;
		}
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
			const pairing = await this.repository.loadPairing();
			if (!pairing) return trackerFailures(trackers, new SyncFailure('pairing'));
			return await Promise.all(trackers.map((tracker) => this.runTracker(tracker, pairing, now)));
		} catch (cause) {
			return trackerFailures(trackers, cause);
		}
	}

	private async runTracker(tracker: TrackerId, pairing: PairingCredentials, now: Date) {
		let permission: PermissionState = 'unknown';
		try {
			const check = await this.jobs[tracker].checkPermission();
			permission = check.state;
			if (permission !== 'granted') throw permissionFailure(permission);
			const payload = await this.jobs[tracker].collect(pairing, now);
			await this.jobs[tracker].upload(pairing, payload);
			return successResult(tracker, permission, now);
		} catch (cause) {
			return failedResult(tracker, permission, cause);
		}
	}
}

function applyResults(
	status: CompanionStatus,
	results: TrackerSyncResult[],
	now: Date
): CompanionStatus {
	const next = copyStatus(status);
	for (const result of results) {
		const previous = status.trackers[result.tracker];
		next.trackers[result.tracker] = resultStatus(previous, result, now);
	}
	return next;
}

function resultStatus(
	previous: CompanionStatus['trackers'][TrackerId],
	result: TrackerSyncResult,
	now: Date
) {
	const attempt = { permission: result.permission, lastAttemptAt: now.toISOString() };
	if (result.outcome === 'success') {
		return { ...attempt, outcome: 'success' as const, lastSuccessAt: result.completedAt };
	}
	return { ...previous, ...attempt, outcome: 'failed' as const, failure: result.failure };
}

function copyStatus(status: CompanionStatus): CompanionStatus {
	return {
		version: 1,
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
			: 'Android permission is required before this tracker can sync.';
	return new SyncFailure('permission', message);
}

function uniqueTrackers(trackers: readonly TrackerId[]) {
	return [...new Set(trackers)];
}

function emptyReport(): SyncReport {
	return { overall: 'idle', results: [] };
}
