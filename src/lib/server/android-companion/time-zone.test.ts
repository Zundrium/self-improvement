import { describe, expect, it, vi } from 'vitest';
import type { Database } from '$lib/server/db';
import { InvalidCompanionTokenError, updateAndroidCompanionTimeZone } from './time-zone';

const token = `stp_${'a'.repeat(64)}`;

type CapturedUpdate = {
	table: unknown;
	values: Record<string, unknown>;
	where: unknown;
};

describe('Android companion time-zone updates', () => {
	it('updates only companion zones in one token-bound batch', async () => {
		const { db, batch, updates } = createDatabase([[{ userId: 'user-1' }], [], []]);
		const timeZone = await updateAndroidCompanionTimeZone(db, token, 'Europe/Amsterdam');

		expect(timeZone).toBe('Europe/Amsterdam');
		expect(updates).toHaveLength(3);
		expect(batch).toHaveBeenCalledOnce();
		for (const update of updates) {
			expect(update.values).toMatchObject({
				companionTimeZone: 'Europe/Amsterdam',
				updatedAt: expect.any(Date)
			});
			expect(update.values.timeZone).toBeUndefined();
		}
	});

	it('rejects a token that no longer matches during the batch', async () => {
		const { db } = createDatabase([[], [], []]);

		await expect(updateAndroidCompanionTimeZone(db, token, 'UTC')).rejects.toBeInstanceOf(
			InvalidCompanionTokenError
		);
	});

	it('validates the time zone before building updates', async () => {
		const { db, batch, update } = createDatabase([[{ userId: 'user-1' }], [], []]);
		await expect(updateAndroidCompanionTimeZone(db, token, 'not/a-zone')).rejects.toThrow();
		expect(update).not.toHaveBeenCalled();
		expect(batch).not.toHaveBeenCalled();
	});
});

function createDatabase(batchResult: unknown[]) {
	const updates: CapturedUpdate[] = [];
	const batch = vi.fn().mockResolvedValue(batchResult);
	const select = vi.fn(() => selectableQuery());
	const update = vi.fn((table: unknown) => ({
		set: (values: Record<string, unknown>) => ({
			where: (where: unknown) => updateStatement(table, values, where)
		})
	}));

	function updateStatement(table: unknown, values: Record<string, unknown>, where: unknown) {
		const statement = { table, values, where };
		updates.push(statement);
		return { ...statement, returning: () => statement };
	}

	return {
		db: { select, update, batch } as unknown as Database,
		batch,
		update,
		updates
	};
}

function selectableQuery() {
	const query = {
		from: () => query,
		where: () => query,
		limit: () => query,
		getSQL: () => ({})
	};
	return query;
}
