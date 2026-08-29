import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
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
});

function trackedStore(name: string) {
	const store = new LocalSecretStore(new LocalSecretDatabase(name));
	stores.push(store);
	return store;
}
