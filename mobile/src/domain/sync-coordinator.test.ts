import { describe, expect, it, vi } from 'vitest';
import { SyncFailure } from './errors';
import type { MobileSyncStatus, AppCredentials, TrackerId } from './model';
import { createEmptyStatus } from './status';
import { SyncCoordinator, type TrackerJob } from './sync-coordinator';
import type { MobileRepository } from '../native/secure-repository';

const defaultCredentials: AppCredentials = {
	apiBaseUrl: 'https://example.com',
	timeZone: 'America/New_York',
	token: 'signed-session-token'
};

class MemoryRepository implements MobileRepository {
	constructor(
		public credentials: AppCredentials | null = structuredClone(defaultCredentials),
		public status: MobileSyncStatus = createEmptyStatus()
	) {}

	async loadCredentials() {
		return this.credentials;
	}

	async saveCredentials(value: AppCredentials) {
		this.credentials = value;
	}

	async loadStatus() {
		return structuredClone(this.status);
	}

	async saveStatus(value: MobileSyncStatus) {
		this.status = structuredClone(value);
	}

	async disconnect() {
		this.credentials = null;
		this.status = createEmptyStatus();
	}
}

describe('sync coordinator', () => {
	it('records partial success and retries only the failed tracker', async () => {
		const repository = new MemoryRepository();
		const jobs = successfulJobs();
		jobs.sleep.upload = vi
			.fn<TrackerJob['upload']>()
			.mockRejectedValueOnce(new SyncFailure('network'))
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
		expect(jobs.steps.upload).toHaveBeenCalledTimes(1);
		expect(jobs.sleep.upload).toHaveBeenCalledTimes(2);
		expect(jobs.screenTime.upload).toHaveBeenCalledTimes(1);
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

	it('retains the previous success timestamp when a later upload fails', async () => {
		const repository = new MemoryRepository();
		const jobs = successfulJobs();
		let now = new Date('2025-03-09T12:00:00.000Z');
		const coordinator = new SyncCoordinator(repository, jobs, () => now);
		await coordinator.sync(['steps']);
		jobs.steps.upload = vi.fn().mockRejectedValue(new SyncFailure('server'));
		now = new Date('2025-03-09T13:00:00.000Z');

		await coordinator.sync(['steps']);

		expect(repository.status.trackers.steps).toMatchObject({
			outcome: 'failed',
			lastAttemptAt: '2025-03-09T13:00:00.000Z',
			lastSuccessAt: '2025-03-09T12:00:00.000Z',
			failure: { category: 'server', retryable: true }
		});
	});

	it('classifies missing credentials independently without invoking collectors', async () => {
		const repository = new MemoryRepository(null);
		const jobs = successfulJobs();
		const report = await new SyncCoordinator(repository, jobs).syncAll();

		expect(report.overall).toBe('failed');
		expect(report.results).toHaveLength(3);
		expect(report.results.every((result) => result.outcome === 'failed')).toBe(true);
		expect(
			report.results.every(
				(result) => result.outcome === 'failed' && result.failure.category === 'session'
			)
		).toBe(true);
		expect(jobs.steps.collect).not.toHaveBeenCalled();
		expect(jobs.sleep.collect).not.toHaveBeenCalled();
		expect(jobs.screenTime.collect).not.toHaveBeenCalled();
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
				failure: { category: 'server', retryable: true }
			},
			{ tracker: 'screenTime', outcome: 'failed', failure: { category: 'validation' } }
		]);
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
		upload: vi.fn().mockResolvedValue(undefined)
	};
}
