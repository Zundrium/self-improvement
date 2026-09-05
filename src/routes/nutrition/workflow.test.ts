import { describe, expect, it, vi } from 'vitest';
import { RequestLifetime, requestError, withAbort } from './workflow';

describe('nutrition request lifetime', () => {
	it('invalidates an earlier request when a newer request starts', () => {
		const lifetime = new RequestLifetime();
		const first = lifetime.begin();
		const second = lifetime.begin();
		expect(first.signal.aborted).toBe(true);
		expect(lifetime.isCurrent(first.id)).toBe(false);
		expect(lifetime.isCurrent(second.id)).toBe(true);
		second.finish();
	});

	it('aborts a stalled request after its deadline', () => {
		vi.useFakeTimers();
		const lifetime = new RequestLifetime();
		const request = lifetime.begin(50);
		vi.advanceTimersByTime(50);
		expect(request.signal.aborted).toBe(true);
		expect(requestError(request.signal.reason, 'failed')).toBe('The request timed out.');
		request.finish();
		vi.useRealTimers();
	});

	it('invalidates work when disposed', () => {
		const lifetime = new RequestLifetime();
		const request = lifetime.begin();
		lifetime.cancel();
		expect(request.signal.aborted).toBe(true);
		expect(lifetime.isCurrent(request.id)).toBe(false);
		request.finish();
	});

	it('stops waiting for an operation that never completes', async () => {
		vi.useFakeTimers();
		const lifetime = new RequestLifetime();
		const request = lifetime.begin(50);
		const result = withAbort(new Promise<string>(() => {}), request.signal);
		vi.advanceTimersByTime(50);
		await expect(result).rejects.toThrow('timed out');
		request.finish();
		vi.useRealTimers();
	});
});
