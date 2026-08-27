import type { FailureCategory, SyncFailureDetails } from './model';

const DEFAULT_MESSAGES: Record<FailureCategory, string> = {
	permission: 'Android permission is required before this tracker can be processed.',
	validation: 'The Android tracker data could not be prepared safely.',
	native: 'Android tracker data could not be read or saved on this device.'
};

const RETRYABLE = new Set<FailureCategory>(['permission', 'native']);

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
	const failure = cause instanceof SyncFailure ? cause : new SyncFailure('native');
	return {
		category: failure.category,
		message: failure.message,
		retryable: failure.retryable
	};
}

export function validationFailure(message?: string) {
	return new SyncFailure('validation', message);
}
