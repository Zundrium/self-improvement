import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalSecretDatabase, LocalSecretStore } from './secrets';

const stores: LocalSecretStore[] = [];

afterEach(async () => {
	await Promise.all(stores.splice(0).map((store) => store.deleteDatabase()));
});

describe('local secrets', () => {
	it('stores, replaces, and clears the OpenRouter API key locally', async () => {
		const name = `local-secrets-test-${crypto.randomUUID()}`;
		const first = trackedStore(name);
		await first.saveOpenRouterApiKey('  first-key  ');

		const second = trackedStore(name);
		expect(await second.openRouterApiKey()).toBe('first-key');

		await second.saveOpenRouterApiKey('second-key');
		expect(await first.openRouterApiKey()).toBe('second-key');

		await first.clearOpenRouterApiKey();
		expect(await second.openRouterApiKey()).toBe('');
	});

	it('migrates and verifies a browser key before deleting it on Android', async () => {
		const database = new LocalSecretDatabase(`local-secrets-test-${crypto.randomUUID()}`);
		const browser = new LocalSecretStore(database);
		stores.push(browser);
		await browser.saveOpenRouterApiKey('legacy-key');
		const values = new Map<string, string>();
		const secure = {
			getItem: async (key: string) => values.get(key) ?? null,
			setItem: async (key: string, value: string) => {
				values.set(key, value);
			},
			removeItem: async (key: string) => {
				values.delete(key);
			}
		};
		const android = new LocalSecretStore(database, secure, () => true);
		expect(await android.openRouterApiKey()).toBe('legacy-key');
		expect(values.get('openrouter-api-key')).toBe('legacy-key');
		expect(await database.secrets.get('openrouter-api-key')).toBeUndefined();
	});

	it('keeps the legacy key when secure migration cannot be verified', async () => {
		const database = new LocalSecretDatabase(`local-secrets-test-${crypto.randomUUID()}`);
		const browser = new LocalSecretStore(database);
		stores.push(browser);
		await browser.saveOpenRouterApiKey('legacy-key');
		const secure = {
			getItem: async () => null,
			setItem: async () => {},
			removeItem: async () => {}
		};
		const android = new LocalSecretStore(database, secure, () => true);
		await expect(android.openRouterApiKey()).rejects.toThrow('verify');
		expect((await database.secrets.get('openrouter-api-key'))?.value).toBe('legacy-key');
	});

	it('verifies a native save and removes an existing legacy value', async () => {
		const database = new LocalSecretDatabase(`local-secrets-test-${crypto.randomUUID()}`);
		const browser = new LocalSecretStore(database);
		stores.push(browser);
		await browser.saveOpenRouterApiKey('legacy-key');
		const values = new Map<string, string>();
		const secure = {
			getItem: async (key: string) => values.get(key) ?? null,
			setItem: async (key: string, value: string) => void values.set(key, value),
			removeItem: async (key: string) => void values.delete(key)
		};
		const android = new LocalSecretStore(database, secure, () => true);
		await android.saveOpenRouterApiKey('new-key');
		expect(values.get('openrouter-api-key')).toBe('new-key');
		expect(await database.secrets.get('openrouter-api-key')).toBeUndefined();
	});

	it('serializes migration and clear so a late migration cannot restore a cleared key', async () => {
		const database = new LocalSecretDatabase(`local-secrets-test-${crypto.randomUUID()}`);
		const browser = new LocalSecretStore(database);
		stores.push(browser);
		await browser.saveOpenRouterApiKey('legacy-key');
		const values = new Map<string, string>();
		let release: (() => void) | undefined;
		const secure = {
			getItem: async (key: string) => values.get(key) ?? null,
			setItem: async (key: string, value: string) => {
				await new Promise<void>((resolve) => (release = resolve));
				values.set(key, value);
			},
			removeItem: async (key: string) => void values.delete(key)
		};
		const android = new LocalSecretStore(database, secure, () => true);
		const migration = android.openRouterApiKey();
		await vi.waitFor(() => expect(release).toBeTypeOf('function'));
		const clearing = android.clearOpenRouterApiKey();
		release?.();
		await Promise.all([migration, clearing]);
		expect(await android.openRouterApiKey()).toBe('');
	});

	it('removes legacy plaintext when the secure key already exists', async () => {
		const database = new LocalSecretDatabase(`local-secrets-test-${crypto.randomUUID()}`);
		const browser = new LocalSecretStore(database);
		stores.push(browser);
		await browser.saveOpenRouterApiKey('legacy-key');
		const values = new Map([['openrouter-api-key', 'secure-key']]);
		const secure = {
			getItem: async (key: string) => values.get(key) ?? null,
			setItem: async (key: string, value: string) => void values.set(key, value),
			removeItem: async (key: string) => void values.delete(key)
		};
		const android = new LocalSecretStore(database, secure, () => true);
		expect(await android.openRouterApiKey()).toBe('secure-key');
		expect(await database.secrets.get('openrouter-api-key')).toBeUndefined();
	});

	it('keeps the secure key when legacy deletion fails during clear', async () => {
		const database = new LocalSecretDatabase(`local-secrets-test-${crypto.randomUUID()}`);
		stores.push(new LocalSecretStore(database));
		await database.secrets.put({ id: 'openrouter-api-key', value: 'legacy-key' });
		const values = new Map([['openrouter-api-key', 'secure-key']]);
		const secure = {
			getItem: async (key: string) => values.get(key) ?? null,
			setItem: async (key: string, value: string) => void values.set(key, value),
			removeItem: async (key: string) => void values.delete(key)
		};
		const android = new LocalSecretStore(database, secure, () => true);
		vi.spyOn(database.secrets, 'delete').mockRejectedValueOnce(new Error('legacy delete failed'));
		await expect(android.clearOpenRouterApiKey()).rejects.toThrow('legacy delete failed');
		expect(values.get('openrouter-api-key')).toBe('secure-key');
	});
});

function trackedStore(name: string) {
	const store = new LocalSecretStore(new LocalSecretDatabase(name));
	stores.push(store);
	return store;
}
