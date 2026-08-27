export const TRACKER_IDS = ['steps', 'sleep', 'screenTime'] as const;

export type TrackerId = (typeof TRACKER_IDS)[number];
export type FailureCategory = 'permission' | 'validation' | 'native';
export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable';
export type SyncOutcome = 'idle' | 'success' | 'failed';

export type SyncContext = { timeZone: string };

export type SyncFailureDetails = {
	category: FailureCategory;
	message: string;
	retryable: boolean;
};

export type TrackerStatus = {
	permission: PermissionState;
	outcome: SyncOutcome;
	lastAttemptAt?: string;
	lastSuccessAt?: string;
	failure?: SyncFailureDetails;
};

export type MobileSyncStatus = {
	version: 2;
	trackers: Record<TrackerId, TrackerStatus>;
};

export type PermissionCheck = {
	state: PermissionState;
	message?: string;
};

export type TrackerSyncResult =
	| {
			tracker: TrackerId;
			outcome: 'success';
			completedAt: string;
			permission: PermissionState;
	  }
	| {
			tracker: TrackerId;
			outcome: 'failed';
			failure: SyncFailureDetails;
			permission: PermissionState;
	  };

export type SyncReport = {
	overall: 'success' | 'partial' | 'failed' | 'idle';
	results: TrackerSyncResult[];
};
