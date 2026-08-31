import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './bounded-concurrency';

describe('mapWithConcurrency', () => {
	it('limits active work and returns results in input order', async () => {
		let active = 0;
		let maximumActive = 0;
		const results = await mapWithConcurrency([3, 2, 1], 2, async (value) => {
			active += 1;
			maximumActive = Math.max(maximumActive, active);
			await new Promise((resolve) => setTimeout(resolve, value));
			active -= 1;
			return value * 10;
		});

		expect(maximumActive).toBe(2);
		expect(results).toEqual([30, 20, 10]);
	});

	it('waits for launched work to settle before rejecting', async () => {
		const failure = deferred<void>();
		const pending = deferred<void>();
		const launched: number[] = [];
		const query = mapWithConcurrency([0, 1, 2], 2, async (value) => {
			launched.push(value);
			if (value === 0) await failure.promise;
			if (value === 1) await pending.promise;
			return value;
		});

		failure.reject(new Error('query failed'));
		await Promise.resolve();
		await Promise.resolve();
		expect(launched).toEqual([0, 1]);

		let rejected = false;
		void query.catch(() => (rejected = true));
		await Promise.resolve();
		expect(rejected).toBe(false);

		pending.resolve();
		await expect(query).rejects.toThrow('query failed');
	});
});

function deferred<Value>() {
	let resolve!: (value: Value) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}
