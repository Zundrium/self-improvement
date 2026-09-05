import { beforeEach, describe, expect, it, vi } from 'vitest';

const invalidate = vi.hoisted(() =>
	vi.fn<(predicate: (url: URL) => boolean) => Promise<void>>(() => Promise.resolve())
);
vi.mock('$app/navigation', () => ({ invalidate }));
import { refreshAppData } from './resources';

describe('app resource refresh', () => {
	beforeEach(() => invalidate.mockClear());
	it('deduplicates simultaneous refresh requests', async () => {
		const first = refreshAppData('app:bootstrap');
		const second = refreshAppData('app:bootstrap');
		expect(second).toBe(first);
		await first;
		expect(invalidate).toHaveBeenCalledTimes(1);
		const predicate = invalidate.mock.calls[0]?.[0];
		expect(predicate?.(new URL('app:bootstrap'))).toBe(true);
		expect(predicate?.(new URL('app:local'))).toBe(true);
	});

	it('runs a trailing refresh when another mutation completes during invalidation', async () => {
		let release: (() => void) | undefined;
		invalidate.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
		const first = refreshAppData('app:local');
		await Promise.resolve();
		const second = refreshAppData('app:local');
		release?.();
		await Promise.all([first, second]);
		expect(invalidate).toHaveBeenCalledTimes(2);
	});
});
