export type OperationCategory = 'storage' | 'native' | 'network' | 'refresh' | 'unknown';
export type DiagnosticOperation =
	| 'restore'
	| 'backup'
	| 'reminders'
	| 'achievements'
	| 'cadence'
	| 'refresh';
export type Diagnostic = {
	at: string;
	operation: DiagnosticOperation;
	category: OperationCategory;
	committed: boolean;
	retryable: boolean;
};

const KEY = 'app-diagnostics-v1';
const LIMIT = 30;
let recent: Diagnostic[] = [];

// Only fixed operation/category metadata is retained. Never store exception messages,
// request bodies, credentials, meal descriptions, or other tracker contents.
export function recordDiagnostic(entry: Omit<Diagnostic, 'at'>) {
	recent = [...recent, { ...entry, at: new Date().toISOString() }].slice(-LIMIT);
	try {
		localStorage.setItem(KEY, JSON.stringify(recent));
	} catch {
		/* Diagnostics must not make an operation fail. */
	}
}

export function diagnostics(): readonly Diagnostic[] {
	return [...recent];
}

export class OperationError extends Error {
	constructor(
		message: string,
		readonly operation: DiagnosticOperation,
		readonly category: OperationCategory,
		readonly committed: boolean,
		readonly retryable: boolean
	) {
		super(message);
	}
}
