export type PausedSession<T> = { version: 1; savedAt: number; value: T };

export function savePausedSession<T>(key: string, value: T) {
	try {
		sessionStorage.setItem(
			key,
			JSON.stringify({ version: 1, savedAt: Date.now(), value } satisfies PausedSession<T>)
		);
	} catch {
		// Recovery is optional; private browsing and storage limits must not interrupt a session.
	}
}

export function loadPausedSession<T>(
	key: string,
	isValid?: (value: unknown) => value is T
): T | undefined {
	try {
		const stored: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null');
		if (!stored || typeof stored !== 'object') return;
		const session = stored as Partial<PausedSession<T>>;
		return session.version === 1 && (!isValid || isValid(session.value))
			? session.value
			: undefined;
	} catch {
		return;
	}
}

export function clearPausedSession(key: string) {
	try {
		sessionStorage.removeItem(key);
	} catch {
		return;
	}
}
