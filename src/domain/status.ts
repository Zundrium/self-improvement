import { z } from 'zod';
import { TRACKER_IDS, type MobileSyncStatus, type SyncReport, type TrackerId } from './model';

const failureSchema = z.object({
	category: z.enum(['permission', 'validation', 'native']),
	message: z.string().min(1).max(240),
	retryable: z.boolean()
});

const trackerStatusSchema = z.object({
	permission: z.enum(['unknown', 'granted', 'denied', 'unavailable']),
	outcome: z.enum(['idle', 'success', 'failed']),
	lastAttemptAt: z.iso.datetime().optional(),
	lastSuccessAt: z.iso.datetime().optional(),
	failure: failureSchema.optional()
});

const mobileSyncStatusSchema = z.object({
	version: z.literal(2),
	trackers: z.object({
		steps: trackerStatusSchema,
		sleep: trackerStatusSchema,
		screenTime: trackerStatusSchema
	})
});

export function createEmptyStatus(): MobileSyncStatus {
	return {
		version: 2,
		trackers: {
			steps: emptyTracker(),
			sleep: emptyTracker(),
			screenTime: emptyTracker()
		}
	};
}

export function parseStoredStatus(input: unknown) {
	return mobileSyncStatusSchema.parse(input) as MobileSyncStatus;
}

export function failedTrackerIds(
	status: MobileSyncStatus,
	enabledTrackers: readonly TrackerId[] = TRACKER_IDS
) {
	const enabled = new Set(enabledTrackers);
	return TRACKER_IDS.filter(
		(tracker) => enabled.has(tracker) && status.trackers[tracker].outcome === 'failed'
	);
}

export function staleTrackerIds(status: MobileSyncStatus, now: Date, staleAfterMs: number) {
	return TRACKER_IDS.filter((tracker) => trackerIsStale(status, tracker, now, staleAfterMs));
}

export function reportOverall(results: SyncReport['results']): SyncReport['overall'] {
	if (!results.length) return 'idle';
	const successes = results.filter((result) => result.outcome === 'success').length;
	if (successes === results.length) return 'success';
	return successes ? 'partial' : 'failed';
}

function emptyTracker() {
	return { permission: 'unknown', outcome: 'idle' } as const;
}

function trackerIsStale(
	status: MobileSyncStatus,
	tracker: TrackerId,
	now: Date,
	staleAfterMs: number
) {
	const trackerStatus = status.trackers[tracker];
	if (trackerStatus.outcome === 'failed') return trackerStatus.failure?.retryable ?? true;
	if (tracker === 'sleep') return true;
	if (!trackerStatus.lastSuccessAt) return true;
	return now.getTime() - Date.parse(trackerStatus.lastSuccessAt) >= staleAfterMs;
}
