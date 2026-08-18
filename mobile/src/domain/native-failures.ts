import { SyncFailure } from './errors';

const USAGE_STATS_PERMISSION_REJECTION = 'Not allowed to query usage stats';

export function healthProviderFailure(cause: unknown) {
	if (cause instanceof SyncFailure) return cause;
	return healthPermissionRejected(cause)
		? new SyncFailure('permission')
		: new SyncFailure('server');
}

export function usageProviderFailure(cause: unknown) {
	if (cause instanceof SyncFailure) return cause;
	return errorMessage(cause) === USAGE_STATS_PERMISSION_REJECTION
		? new SyncFailure('permission')
		: new SyncFailure('server');
}

function healthPermissionRejected(cause: unknown) {
	return /permission|authori[sz]|security|denied/i.test(errorMessage(cause));
}

function errorMessage(cause: unknown) {
	return cause instanceof Error ? cause.message : '';
}
