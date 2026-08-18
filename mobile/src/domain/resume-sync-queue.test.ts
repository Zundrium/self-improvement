import { describe, expect, it } from 'vitest';
import { ResumeSyncQueue } from './resume-sync-queue';

describe('resume sync queue', () => {
	it('coalesces busy resume events into one pending sync', () => {
		const queue = new ResumeSyncQueue();

		queue.enqueue();
		queue.enqueue();

		expect(queue.dequeue()).toBe(true);
		expect(queue.dequeue()).toBe(false);
	});
});
