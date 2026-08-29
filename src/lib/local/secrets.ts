import Dexie, { type EntityTable } from 'dexie';

const OPENROUTER_KEY_ID = 'openrouter-api-key';

type SecretRow = { id: string; value: string };

export class LocalSecretDatabase extends Dexie {
	secrets!: EntityTable<SecretRow, 'id'>;

	constructor(name = 'self-improvement-secrets') {
		super(name);
		this.version(1).stores({ secrets: 'id' });
	}
}

export class LocalSecretStore {
	constructor(private readonly database = new LocalSecretDatabase()) {}

	async openRouterApiKey() {
		return (await this.database.secrets.get(OPENROUTER_KEY_ID))?.value ?? '';
	}

	async saveOpenRouterApiKey(apiKey: string) {
		const value = apiKey.trim();
		if (!value) throw new Error('Enter an OpenRouter API key.');
		await this.database.secrets.put({ id: OPENROUTER_KEY_ID, value });
	}

	async clearOpenRouterApiKey() {
		await this.database.secrets.delete(OPENROUTER_KEY_ID);
	}

	async deleteDatabase() {
		this.database.close();
		await this.database.delete();
	}
}

export const localSecretStore = new LocalSecretStore();
