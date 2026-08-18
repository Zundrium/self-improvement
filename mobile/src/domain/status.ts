import { z } from 'zod';
import { TRACKER_IDS, type CompanionStatus, type SyncReport, type TrackerId } from './model';

const failureSchema = z.object({
	category: z.enum(['pairing', 'permission', 'validation', 'auth', 'network', 'server']),
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

const companionStatusSchema = z.object({
	version: z.literal(1),
	trackers: z.object({
		steps: trackerStatusSchema,
		sleep: trackerStatusSchema,
		screenTime: trackerStatusSchema
	})
});

export function createEmptyStatus(): CompanionStatus {
	return {
		version: 1,
		trackers: {
			steps: emptyTracker(),
			sleep: emptyTracker(),
			screenTime: emptyTracker()
		}
	};
}

export function parseStoredStatus(input: unknown) {
	return companionStatusSchema.parse(input) as CompanionStatus;
}

export function failedTrackerIds(status: CompanionStatus) {
	return TRACKER_IDS.filter((tracker) => status.trackers[tracker].outcome === 'failed');
}

export function staleTrackerIds(status: CompanionStatus, now: Date, staleAfterMs: number) {
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
	status: CompanionStatus,
	tracker: TrackerId,
	now: Date,
	staleAfterMs: number
) {
	const trackerStatus = status.trackers[tracker];
	if (trackerStatus.outcome === 'failed') return trackerStatus.failure?.retryable ?? true;
	if (!trackerStatus.lastSuccessAt) return true;
	return now.getTime() - Date.parse(trackerStatus.lastSuccessAt) >= staleAfterMs;
}
