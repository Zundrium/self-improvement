import { describe, expect, it, vi } from 'vitest';
import { SyncFailure } from './errors';
import type { MobileSyncStatus, SyncContext, TrackerId } from './model';
import { createEmptyStatus } from './status';
import { SyncCoordinator, type TrackerJob } from './sync-coordinator';
import type { MobileRepository } from '../native/secure-repository';

const defaultContext: SyncContext = { timeZone: 'America/New_York' };

class MemoryRepository implements MobileRepository {
	constructor(
		public context: SyncContext = structuredClone(defaultContext),
		public status: MobileSyncStatus = createEmptyStatus()
	) {}

	async loadSyncContext() {
		return this.context;
	}

	async loadStatus() {
		return structuredClone(this.status);
	}

	async saveStatus(value: MobileSyncStatus) {
		this.status = structuredClone(value);
	}
}

describe('sync coordinator', () => {
	it('records partial success and retries only the failed tracker', async () => {
		const repository = new MemoryRepository();
		const jobs = successfulJobs();
		jobs.sleep.process = vi
			.fn<TrackerJob['process']>()
			.mockRejectedValueOnce(new SyncFailure('native'))
			.mockResolvedValue(undefined);
		const coordinator = new SyncCoordinator(
			repository,
			jobs,
			() => new Date('2025-03-09T12:00:00.000Z')
		);

		const first = await coordinator.syncAll();
		const retry = await coordinator.syncStale();

		expect(first.overall).toBe('partial');
		expect(first.results.map(({ outcome }) => outcome)).toEqual(['success', 'failed', 'success']);
		expect(retry).toMatchObject({
			overall: 'success',
			results: [{ tracker: 'sleep', outcome: 'success' }]
		});
		expect(jobs.steps.process).toHaveBeenCalledTimes(1);
		expect(jobs.sleep.process).toHaveBeenCalledTimes(2);
		expect(jobs.screenTime.process).toHaveBeenCalledTimes(1);
		expect(repository.status.trackers.sleep).toMatchObject({
			outcome: 'success',
			lastSuccessAt: '2025-03-09T12:00:00.000Z'
		});
		expect(repository.status.trackers.sleep.failure).toBeUndefined();
	});

	it('refreshes sleep on every stale sync so app opens collect detailed events', async () => {
		const repository = new MemoryRepository();
		const jobs = successfulJobs();
		const coordinator = new SyncCoordinator(
			repository,
			jobs,
			() => new Date('2025-03-09T12:00:00.000Z')
		);

		await coordinator.syncAll();
		const report = await coordinator.syncStale();

		expect(report.results).toEqual([
			expect.objectContaining({ tracker: 'sleep', outcome: 'success' })
		]);
		expect(jobs.sleep.collect).toHaveBeenCalledTimes(2);
	});

	it('retains the previous success timestamp when later processing fails', async () => {
		const repository = new MemoryRepository();
		const jobs = successfulJobs();
		let now = new Date('2025-03-09T12:00:00.000Z');
		const coordinator = new SyncCoordinator(repository, jobs, () => now);
		await coordinator.sync(['steps']);
		jobs.steps.process = vi.fn().mockRejectedValue(new SyncFailure('native'));
		now = new Date('2025-03-09T13:00:00.000Z');

		await coordinator.sync(['steps']);

		expect(repository.status.trackers.steps).toMatchObject({
			outcome: 'failed',
			lastAttemptAt: '2025-03-09T13:00:00.000Z',
			lastSuccessAt: '2025-03-09T12:00:00.000Z',
			failure: { category: 'native', retryable: true }
		});
	});

	it('classifies denied permission, transient providers, and validated data separately', async () => {
		const repository = new MemoryRepository();
		const jobs = successfulJobs();
		jobs.steps.checkPermission = vi.fn().mockResolvedValue({ state: 'denied' });
		jobs.sleep.collect = vi.fn().mockRejectedValue(new Error('provider disconnected'));
		jobs.screenTime.collect = vi.fn().mockRejectedValue(new SyncFailure('validation'));
		const report = await new SyncCoordinator(repository, jobs).sync([
			'steps',
			'sleep',
			'screenTime'
		]);

		expect(report.results).toMatchObject([
			{ tracker: 'steps', outcome: 'failed', failure: { category: 'permission' } },
			{
				tracker: 'sleep',
				outcome: 'failed',
				failure: { category: 'native', retryable: true }
			},
			{ tracker: 'screenTime', outcome: 'failed', failure: { category: 'validation' } }
		]);
	});

	it('filters manual and stale syncs to enabled trackers', async () => {
		const repository = new MemoryRepository();
		const jobs = successfulJobs();
		let now = new Date('2025-03-09T12:00:00.000Z');
		const coordinator = new SyncCoordinator(
			repository,
			jobs,
			() => now,
			async () => ['steps']
		);

		const manual = await coordinator.syncAll();
		now = new Date('2025-03-09T12:16:00.000Z');
		const stale = await coordinator.syncStale();

		expect(manual.results.map(({ tracker }) => tracker)).toEqual(['steps']);
		expect(stale.results.map(({ tracker }) => tracker)).toEqual(['steps']);
		expect(jobs.steps.process).toHaveBeenCalledTimes(2);
		expect(jobs.sleep.process).not.toHaveBeenCalled();
		expect(jobs.screenTime.process).not.toHaveBeenCalled();
	});

	it('coalesces overlapping sync requests before permissions or native collection', async () => {
		const repository = new MemoryRepository();
		const jobs = successfulJobs();
		const coordinator = new SyncCoordinator(repository, jobs);

		const first = coordinator.sync(['steps']);
		const overlapping = coordinator.sync(['sleep']);
		const [firstReport, overlappingReport] = await Promise.all([first, overlapping]);

		expect(firstReport).toEqual(overlappingReport);
		expect(firstReport.results.map(({ tracker }) => tracker)).toEqual(['steps']);
		expect(jobs.steps.collect).toHaveBeenCalledTimes(1);
		expect(jobs.sleep.collect).not.toHaveBeenCalled();
	});
});

function successfulJobs() {
	return Object.fromEntries(
		(['steps', 'sleep', 'screenTime'] as TrackerId[]).map((tracker) => [tracker, successfulJob()])
	) as Record<TrackerId, TrackerJob>;
}

function successfulJob(): TrackerJob {
	return {
		checkPermission: vi.fn().mockResolvedValue({ state: 'granted' }),
		collect: vi.fn().mockResolvedValue({}),
		process: vi.fn().mockResolvedValue(undefined)
	};
}
