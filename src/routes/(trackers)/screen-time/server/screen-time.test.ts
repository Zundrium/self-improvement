import { describe, expect, it, vi } from 'vitest';
import type { Database } from '$lib/server/db';
import { parseScreenTimePayload } from '../screen-time';
import { createScreenTimeConnection, recordScreenTimePayload } from './screen-time';

describe('screen-time ingestion state', () => {
	it('marks valid empty payloads as received', async () => {
		const { db, set } = createDatabase();
		const payload = parseScreenTimePayload({
			timestamp: '2026-08-17T12:00:00Z',
			app_version: '1.0.0',
			screen_time: []
		});
		const accepted = await recordScreenTimePayload(
			db,
			{ userId: 'user-1', timeZone: 'UTC' },
			payload
		);

		expect(accepted).toBe(0);
		expect(set).toHaveBeenCalledWith({
			appVersion: '1.0.0',
			device: null,
			source: 'screen_time',
			lastReceivedAt: expect.any(Date),
			updatedAt: expect.any(Date)
		});
	});

	it('preserves the companion token when legacy webhook credentials rotate', async () => {
		const { db, onConflictDoUpdate } = createConnectionDatabase();
		const token = await createScreenTimeConnection(db, 'user-1', 'Europe/Amsterdam');
		const [{ set: values }] = onConflictDoUpdate.mock.calls[0];

		expect(token).toMatch(/^scr_[a-f0-9]{64}$/);
		expect(values).not.toHaveProperty('companionTokenHash');
		expect(values).toMatchObject({ timeZone: 'Europe/Amsterdam' });
	});
});

function createDatabase() {
	const where = vi.fn().mockResolvedValue(undefined);
	const set = vi.fn(() => ({ where }));
	const update = vi.fn(() => ({ set }));
	return { db: { update } as unknown as Database, set };
}

function createConnectionDatabase() {
	const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
	const values = vi.fn(() => ({ onConflictDoUpdate }));
	const insert = vi.fn(() => ({ values }));
	return { db: { insert } as unknown as Database, onConflictDoUpdate };
}
