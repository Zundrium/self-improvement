import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '$lib/server/db';

const trackerCredentials = vi.hoisted(() => ({
	createSteps: vi.fn(),
	createSleep: vi.fn(),
	createScreenTime: vi.fn(),
	hashSteps: vi.fn(),
	hashSleep: vi.fn(),
	hashScreenTime: vi.fn()
}));

vi.mock('../../../routes/(trackers)/steps/server/steps', () => ({
	createStepToken: trackerCredentials.createSteps,
	hashStepToken: trackerCredentials.hashSteps
}));
vi.mock('../../../routes/(trackers)/sleep/server/sleep', () => ({
	createSleepToken: trackerCredentials.createSleep,
	hashSleepToken: trackerCredentials.hashSleep
}));
vi.mock('../../../routes/(trackers)/screen-time/server/screen-time', () => ({
	createScreenTimeToken: trackerCredentials.createScreenTime,
	hashScreenTimeToken: trackerCredentials.hashScreenTime
}));

import { rotateAndroidCompanionCredentials } from './pairing';

const userId = 'user-1';
const tokens = {
	steps: `stp_${'a'.repeat(64)}`,
	sleep: `slp_${'b'.repeat(64)}`,
	screenTime: `scr_${'c'.repeat(64)}`
};
const tokenHashes = {
	steps: '1'.repeat(64),
	sleep: '2'.repeat(64),
	screenTime: '3'.repeat(64)
};

type CapturedUpsert = {
	table: unknown;
	values?: Record<string, unknown>;
	conflict?: { target: unknown; set: Record<string, unknown> };
};

describe('Android companion credential rotation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trackerCredentials.createSteps.mockReturnValue(tokens.steps);
		trackerCredentials.createSleep.mockReturnValue(tokens.sleep);
		trackerCredentials.createScreenTime.mockReturnValue(tokens.screenTime);
		trackerCredentials.hashSteps.mockResolvedValue(tokenHashes.steps);
		trackerCredentials.hashSleep.mockResolvedValue(tokenHashes.sleep);
		trackerCredentials.hashScreenTime.mockResolvedValue(tokenHashes.screenTime);
	});

	it('hashes all credentials before one atomic batch and starts in UTC', async () => {
		const { db, batch, upserts } = createDatabase();
		const payload = await rotateAndroidCompanionCredentials(db, userId, 'https://EXAMPLE.com:443/');

		expect(trackerCredentials.hashSteps).toHaveBeenCalledWith(tokens.steps);
		expect(trackerCredentials.hashSleep).toHaveBeenCalledWith(tokens.sleep);
		expect(trackerCredentials.hashScreenTime).toHaveBeenCalledWith(tokens.screenTime);
		const hashCallOrder = [
			trackerCredentials.hashSteps,
			trackerCredentials.hashSleep,
			trackerCredentials.hashScreenTime
		].map((hash) => hash.mock.invocationCallOrder[0]);
		expect(Math.max(...hashCallOrder)).toBeLessThan(batch.mock.invocationCallOrder[0]);
		expect(batch).toHaveBeenCalledOnce();
		expect(batch).toHaveBeenCalledWith(upserts);
		expect(payload).toEqual({
			version: 1,
			apiBaseUrl: 'https://example.com',
			timeZone: 'UTC',
			tokens
		});
	});

	it('uses inaccessible fallback hashes without replacing existing webhook state', async () => {
		const { db, upserts } = createDatabase();
		await rotateAndroidCompanionCredentials(db, userId, 'https://example.com');

		expect(upserts).toHaveLength(3);
		expect(upserts.map((upsert) => upsert.values?.companionTokenHash)).toEqual([
			tokenHashes.steps,
			tokenHashes.sleep,
			tokenHashes.screenTime
		]);
		const fallbackHashes = upserts.map((upsert) => upsert.values?.tokenHash);
		expect(fallbackHashes).toEqual(
			fallbackHashes.map(() => expect.stringMatching(/^[a-f0-9]{64}$/))
		);
		expect(new Set(fallbackHashes).size).toBe(3);
		for (const upsert of upserts) {
			expect(upsert.values).toMatchObject({
				userId,
				timeZone: 'UTC',
				companionTimeZone: 'UTC'
			});
			expect(Object.keys(upsert.conflict?.set ?? {}).sort()).toEqual([
				'companionTimeZone',
				'companionTokenHash',
				'updatedAt'
			]);
		}
	});

	it('does not write or return plaintext when hashing fails', async () => {
		const { db, batch } = createDatabase();
		trackerCredentials.hashSleep.mockRejectedValue(new Error('hash failed'));

		await expect(
			rotateAndroidCompanionCredentials(db, userId, 'https://example.com')
		).rejects.toThrow('hash failed');
		expect(batch).not.toHaveBeenCalled();
	});

	it('does not return plaintext when the atomic batch fails', async () => {
		const { db, batch } = createDatabase();
		batch.mockRejectedValue(new Error('batch failed'));

		await expect(
			rotateAndroidCompanionCredentials(db, userId, 'https://example.com')
		).rejects.toThrow('batch failed');
		expect(batch).toHaveBeenCalledOnce();
	});

	it('validates the origin before generating credentials', async () => {
		const { db, batch } = createDatabase();
		await expect(
			rotateAndroidCompanionCredentials(db, userId, 'http://example.com')
		).rejects.toThrow();
		expect(trackerCredentials.createSteps).not.toHaveBeenCalled();
		expect(batch).not.toHaveBeenCalled();
	});
});

function createDatabase() {
	const upserts: CapturedUpsert[] = [];
	const batch = vi.fn().mockResolvedValue([]);
	const insert = vi.fn((table: unknown) => ({
		values: (values: Record<string, unknown>) => ({
			onConflictDoUpdate: (conflict: CapturedUpsert['conflict']) => {
				const upsert = { table, values, conflict };
				upserts.push(upsert);
				return upsert;
			}
		})
	}));
	return { db: { insert, batch } as unknown as Database, batch, upserts };
}
