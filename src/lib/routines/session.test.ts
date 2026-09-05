import { afterEach, describe, expect, it } from 'vitest';
import { clearPausedSession, loadPausedSession, savePausedSession } from './session';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {
	value: {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key)
	},
	configurable: true
});

afterEach(() => values.clear());

describe('paused session recovery', () => {
	it('restores only the stored paused state and can clear it', () => {
		savePausedSession('timer', { remainingSeconds: 42 });
		expect(loadPausedSession<{ remainingSeconds: number }>('timer')).toEqual({
			remainingSeconds: 42
		});
		clearPausedSession('timer');
		expect(loadPausedSession('timer')).toBeUndefined();
	});

	it('rejects malformed values with a caller validator', () => {
		values.set(
			'timer',
			JSON.stringify({ version: 1, savedAt: 1, value: { remainingSeconds: 'nope' } })
		);
		expect(
			loadPausedSession('timer', (value): value is { remainingSeconds: number } =>
				Boolean(
					value &&
						typeof value === 'object' &&
						typeof (value as { remainingSeconds?: unknown }).remainingSeconds === 'number'
				)
			)
		).toBeUndefined();
	});
});
