import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAppState, LocalAppDatabase, LocalAppStore } from '../state';
import { LocalAppService } from '../service';
import type { NativeDatabaseConnection } from './connection';

const files = vi.hoisted(() => ({
	values: new Map<string, string>(),
	failNextRead: false,
	failSecurePath: undefined as string | undefined,
	failStatPath: undefined as string | undefined,
	failDeletePath: undefined as string | undefined,
	reads: 0
}));

vi.mock('@capacitor/filesystem', () => ({
	Directory: { Data: 'DATA' },
	Filesystem: {
		writeFile: async ({ path, data }: { path: string; data: string }) => {
			files.values.set(path, data);
		},
		readFile: async ({ path }: { path: string }) => {
			files.reads += 1;
			if (files.failNextRead) {
				files.failNextRead = false;
				throw new Error('Transient I/O failure');
			}
			if (!files.values.has(path)) throw new Error('Missing file');
			return { data: files.values.get(path) };
		},
		stat: async ({ path }: { path: string }) => {
			if (files.failStatPath === path) {
				files.failStatPath = undefined;
				throw nativeFileError('Could not verify original file', 'OS-PLUG-FILE-0013');
			}
			if (!files.values.has(path)) throw nativeFileError('Missing file', 'OS-PLUG-FILE-0008');
			return { type: 'file' };
		},
		rename: async ({ from, to }: { from: string; to: string }) => {
			if (files.failSecurePath === from) {
				files.failSecurePath = undefined;
				throw new Error('Could not secure original file');
			}
			if (!files.values.has(from)) throw new Error('Missing file');
			if (files.values.has(to)) throw new Error('Destination already exists');
			files.values.set(to, files.values.get(from) as string);
			files.values.delete(from);
		},
		deleteFile: async ({ path }: { path: string }) => {
			if (files.failDeletePath === path) {
				files.failDeletePath = undefined;
				throw nativeFileError('Could not delete promoted file', 'OS-PLUG-FILE-0013');
			}
			if (!files.values.has(path)) throw nativeFileError('Missing file', 'OS-PLUG-FILE-0008');
			files.values.delete(path);
		}
	}
}));

afterEach(() => {
	files.values.clear();
	files.failNextRead = false;
	files.failSecurePath = undefined;
	files.failStatPath = undefined;
	files.failDeletePath = undefined;
	files.reads = 0;
});

describe('native nutrition media safety', () => {
	it('does not read nutrition files for repeated bootstrap or gamification queries', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const database = new LocalAppDatabase(`media-gamification-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite));
		const now = new Date('2026-09-05T12:00:00.000Z');
		const service = new LocalAppService(store, () => now);
		try {
			await store.replaceState(nutritionState());
			files.reads = 0;
			await service.request('/api/app/bootstrap');
			await service.request('/api/app/bootstrap');
			await service.request('/api/app/gamification');
			expect(files.reads).toBe(0);
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('preserves the original file and row after a transient media read failure during an edit', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const database = new LocalAppDatabase(`media-safety-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite));
		try {
			await store.replaceState(nutritionState());
			const original = sqlite
				.prepare('SELECT relative_path, byte_size FROM nutrition_media')
				.get() as { relative_path: string; byte_size: number };

			files.failNextRead = true;
			await store.updateDomains(['nutrition'], (state) => {
				state.nutrition.entries[0].notes = 'Metadata only';
			});

			const retained = sqlite
				.prepare('SELECT relative_path, byte_size FROM nutrition_media')
				.get() as { relative_path: string; byte_size: number };
			expect(retained).toEqual(original);
			expect(files.values.get(original.relative_path)).toBe('aGVsbG8=');
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('fails an export on a transient media read and succeeds when retried', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const database = new LocalAppDatabase(`media-export-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite));
		try {
			await store.replaceState(nutritionState());
			files.failNextRead = true;
			await expect(store.exportState()).rejects.toThrow('Please retry the backup');
			await expect(store.exportState()).resolves.toMatchObject({
				nutrition: {
					entries: [{ meals: [{ imageDataUrl: 'data:image/jpeg;base64,aGVsbG8=' }] }]
				}
			});
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('restores a missing native file even when its media path is unchanged', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const database = new LocalAppDatabase(`media-restore-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite));
		try {
			await store.replaceState(nutritionState());
			const backup = await store.exportState();
			const path = String(
				sqlite.prepare('SELECT relative_path FROM nutrition_media').get()?.relative_path
			);
			files.values.delete(path);

			await store.replaceState(backup);

			expect(files.values.get(path)).toBe('aGVsbG8=');
			expect(
				(await store.readNutritionEntry('entry')).nutrition.entries[0].meals[0].imageDataUrl
			).toBe('data:image/jpeg;base64,aGVsbG8=');
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('removes staged files when starting the database transaction fails', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const controls: AdapterControls = {};
		const database = new LocalAppDatabase(`media-begin-failure-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite, controls));
		try {
			await store.replaceState(nutritionState());
			const backup = await store.exportState();
			const path = mediaPath(sqlite);
			controls.failNextBegin = true;

			await expect(store.replaceState(backup)).rejects.toThrow('Could not begin transaction');

			expect(files.values.get(path)).toBe('aGVsbG8=');
			expect(stagingPaths()).toEqual([]);
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('uses unique staging names and ignores stale fixed-name artifacts', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const database = new LocalAppDatabase(`media-unique-stage-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite));
		try {
			await store.replaceState(nutritionState());
			const backup = await store.exportState();
			const path = mediaPath(sqlite);
			files.values.set(`${path}.tmp`, 'stale-temp');
			files.values.set(`${path}.bak`, 'stale-backup');

			await store.replaceState(backup);

			expect(files.values.get(path)).toBe('aGVsbG8=');
			expect(files.values.get(`${path}.tmp`)).toBe('stale-temp');
			expect(files.values.get(`${path}.bak`)).toBe('stale-backup');
			expect(stagingPaths()).toEqual([]);
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('aborts replacement when the existing file cannot be secured', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const database = new LocalAppDatabase(`media-secure-failure-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite));
		try {
			await store.replaceState(nutritionState());
			const backup = await store.exportState();
			const path = mediaPath(sqlite);
			files.values.set(path, 'corrupt-original');
			files.failSecurePath = path;

			await expect(store.replaceState(backup)).rejects.toThrow('Could not secure original file');

			expect(files.values.get(path)).toBe('corrupt-original');
			expect(stagingPaths()).toEqual([]);
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('preserves the original when checking a failed secure operation also fails', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const database = new LocalAppDatabase(`media-stat-failure-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite));
		try {
			await store.replaceState(nutritionState());
			const backup = await store.exportState();
			const path = mediaPath(sqlite);
			files.values.set(path, 'original');
			files.failSecurePath = path;
			files.failStatPath = path;

			await expect(store.replaceState(backup)).rejects.toThrow('Could not verify original file');

			expect(files.values.get(path)).toBe('original');
			expect(stagingPaths()).toEqual([]);
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('restores the original file when the database commit fails after promotion', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const controls: AdapterControls = {};
		const database = new LocalAppDatabase(`media-commit-failure-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite, controls));
		try {
			await store.replaceState(nutritionState());
			const backup = await store.exportState();
			const path = mediaPath(sqlite);
			files.values.set(path, 'corrupt-original');
			controls.failNextCommit = true;

			await expect(store.replaceState(backup)).rejects.toThrow('Could not commit transaction');

			expect(files.values.get(path)).toBe('corrupt-original');
			expect(stagingPaths()).toEqual([]);
		} finally {
			database.close();
			sqlite.close();
		}
	});

	it('retains the secured backup when rollback cannot remove the promoted file', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const controls: AdapterControls = {};
		const database = new LocalAppDatabase(`media-rollback-delete-${crypto.randomUUID()}`);
		const store = new LocalAppStore(database, async () => sqliteAdapter(sqlite, controls));
		try {
			await store.replaceState(nutritionState());
			const backup = await store.exportState();
			const path = mediaPath(sqlite);
			files.values.set(path, 'original');
			controls.failNextCommit = true;
			files.failDeletePath = path;

			await expect(store.replaceState(backup)).rejects.toThrow('Could not delete promoted file');

			expect(files.values.get(path)).toBe('aGVsbG8=');
			expect(
				[...files.values.entries()].some(
					([candidate, value]) => candidate.includes('.bak-') && value === 'original'
				)
			).toBe(true);
		} finally {
			database.close();
			sqlite.close();
		}
	});
});

function nativeFileError(message: string, code: string) {
	return Object.assign(new Error(message), { code });
}

function mediaPath(sqlite: DatabaseSync) {
	return String(sqlite.prepare('SELECT relative_path FROM nutrition_media').get()?.relative_path);
}

function stagingPaths() {
	return [...files.values.keys()].filter((path) => /\.(?:tmp|bak)-/.test(path));
}

function nutritionState() {
	const state = createDefaultAppState(new Date('2026-09-05T12:00:00.000Z'));
	const totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 };
	state.nutrition.entries.push({
		id: 'entry',
		date: '2026-09-05',
		name: 'Meal',
		notes: '',
		createdAt: state.updatedAt,
		thumbnail: '',
		totals,
		meals: [
			{
				id: 'meal',
				name: 'Meal',
				imageDataUrl: 'data:image/jpeg;base64,aGVsbG8=',
				ingredients: [],
				totals
			}
		]
	});
	return state;
}

type AdapterControls = { failNextBegin?: boolean; failNextCommit?: boolean };

function sqliteAdapter(
	sqlite: DatabaseSync,
	controls: AdapterControls = {}
): NativeDatabaseConnection {
	return {
		beginTransaction: async () => {
			if (controls.failNextBegin) {
				controls.failNextBegin = false;
				throw new Error('Could not begin transaction');
			}
			sqlite.exec('BEGIN;');
		},
		commitTransaction: async () => {
			if (controls.failNextCommit) {
				controls.failNextCommit = false;
				throw new Error('Could not commit transaction');
			}
			sqlite.exec('COMMIT;');
		},
		rollbackTransaction: async () => sqlite.exec('ROLLBACK;'),
		execute: async (sql) => sqlite.exec(sql),
		query: async (sql, values = []) => ({
			values: sqlite.prepare(sql).all(...(values as SQLInputValue[])) as Array<
				Record<string, unknown>
			>
		}),
		run: async (sql, values = []) => sqlite.prepare(sql).run(...(values as SQLInputValue[])),
		delete: async () => undefined
	};
}
