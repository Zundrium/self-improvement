import type { FailureCategory, SyncFailureDetails } from './model';

const DEFAULT_MESSAGES: Record<FailureCategory, string> = {
	session: 'Sign in again and try again.',
	permission: 'Android permission is required before this tracker can sync.',
	validation: 'The device data could not be prepared safely.',
	auth: 'Your session expired. Sign in again.',
	network: 'No connection to the server. Sync will retry when the app resumes.',
	server: 'The server could not accept this tracker right now.'
};

const RETRYABLE = new Set<FailureCategory>(['permission', 'network', 'server']);

export class SyncFailure extends Error {
	constructor(
		readonly category: FailureCategory,
		message = DEFAULT_MESSAGES[category],
		readonly retryable = RETRYABLE.has(category)
	) {
		super(message);
		this.name = 'SyncFailure';
	}
}

export function classifyFailure(cause: unknown): SyncFailureDetails {
	const failure = cause instanceof SyncFailure ? cause : unknownFailure();
	return {
		category: failure.category,
		message: failure.message,
		retryable: failure.retryable
	};
}

export function validationFailure(message?: string) {
	return new SyncFailure('validation', message);
}

function unknownFailure() {
	return new SyncFailure('server');
}
