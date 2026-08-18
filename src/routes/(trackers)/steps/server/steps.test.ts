import { describe, expect, it, vi } from 'vitest';
import type { Database } from '$lib/server/db';
import { createStepConnection } from './steps';

describe('step webhook credential rotation', () => {
	it('preserves the companion token when legacy webhook credentials rotate', async () => {
		const { db, onConflictDoUpdate } = createDatabase();
		const token = await createStepConnection(db, 'user-1', 'Europe/Amsterdam');
		const [{ set: values }] = onConflictDoUpdate.mock.calls[0];

		expect(token).toMatch(/^stp_[a-f0-9]{64}$/);
		expect(values).not.toHaveProperty('companionTokenHash');
		expect(values).toMatchObject({ timeZone: 'Europe/Amsterdam' });
	});
});

function createDatabase() {
	const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
	const values = vi.fn(() => ({ onConflictDoUpdate }));
	const insert = vi.fn(() => ({ values }));
	return { db: { insert } as unknown as Database, onConflictDoUpdate };
}
