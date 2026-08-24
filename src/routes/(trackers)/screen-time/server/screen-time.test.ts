import { describe, expect, it, vi } from 'vitest';
import type { Database } from '$lib/server/db';
import { parseScreenTimePayload } from '../screen-time';
import {
	createScreenTimeConnection,
	getDailyScreenTime,
	getKnownScreenTimeApps,
	recordScreenTimePayload,
	trackedScreenTimeSnapshot
} from './screen-time';

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

	it('stores every synced app in the raw snapshot', async () => {
		const { db, values } = createIngestionDatabase();
		const payload = parseScreenTimePayload(screenTimePayload());

		await recordScreenTimePayload(db, { userId: 'user-1', timeZone: 'UTC' }, payload);

		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({ totalMinutes: 75, apps: payload.screen_time[0].apps })
		);
	});
});

describe('tracked screen-time reads', () => {
	it('defaults to no usage when the allowlist is empty', () => {
		const snapshot = rawSnapshot();

		expect(trackedScreenTimeSnapshot(snapshot, new Set())).toMatchObject({
			totalMinutes: 0,
			apps: []
		});
		expect(snapshot.apps).toHaveLength(2);
	});

	it('calculates daily totals and apps from tracked packages', async () => {
		const db = createReadDatabase([rawSnapshot()], ['com.example.browser']);
		const [snapshot] = await getDailyScreenTime(db, 'user-1', '2026-08-17', '2026-08-17');

		expect(snapshot).toMatchObject({
			totalMinutes: 45,
			apps: [expect.objectContaining({ package: 'com.example.browser' })]
		});
	});

	it('returns known apps with their tracked state and latest name', async () => {
		const latestApps = rawSnapshot().apps;
		const olderApps = [{ ...latestApps[0], name: 'Old browser name' }];
		const db = createReadDatabase(
			[{ apps: latestApps }, { apps: olderApps }],
			['com.example.browser']
		);

		expect(await getKnownScreenTimeApps(db, 'user-1')).toEqual([
			{ package: 'com.example.browser', name: 'Browser', tracked: true },
			{ package: 'com.example.mail', name: 'Mail', tracked: false }
		]);
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

function createIngestionDatabase() {
	const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
	const values = vi.fn(() => ({ onConflictDoUpdate }));
	const insert = vi.fn(() => ({ values }));
	const where = vi.fn().mockResolvedValue(undefined);
	const set = vi.fn(() => ({ where }));
	const update = vi.fn(() => ({ set }));
	return { db: { insert, update } as unknown as Database, values };
}

function createReadDatabase(snapshots: unknown[], trackedPackages: string[]) {
	const select = vi
		.fn()
		.mockReturnValueOnce(orderedQuery(snapshots))
		.mockReturnValueOnce(query(trackedPackages.map((packageName) => ({ packageName }))));
	return { select } as unknown as Database;
}

function orderedQuery(rows: unknown[]) {
	return { from: () => ({ where: () => ({ orderBy: () => Promise.resolve(rows) }) }) };
}

function query(rows: unknown[]) {
	return { from: () => ({ where: () => Promise.resolve(rows) }) };
}

function rawSnapshot() {
	return {
		userId: 'user-1',
		localDate: '2026-08-17',
		totalMinutes: 75,
		apps: screenTimePayload().screen_time[0].apps,
		sourceTimestamp: new Date('2026-08-17T12:00:00Z'),
		syncedAt: new Date('2026-08-17T12:01:00Z')
	};
}

function screenTimePayload() {
	return {
		timestamp: '2026-08-17T12:00:00Z',
		app_version: '1.0.0',
		screen_time: [
			{
				date: '2026-08-17',
				total_screen_time_minutes: 75,
				apps: [
					{
						package: 'com.example.browser',
						name: 'Browser',
						minutes: 45,
						last_used: '2026-08-17T11:00:00Z'
					},
					{
						package: 'com.example.mail',
						name: 'Mail',
						minutes: 30,
						last_used: '2026-08-17T10:00:00Z'
					}
				]
			}
		]
	};
}
