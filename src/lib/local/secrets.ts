import Dexie, { type EntityTable } from 'dexie';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { isNativeAndroid } from '../../native/platform';

const OPENROUTER_KEY_ID = 'openrouter-api-key';

type SecretRow = { id: string; value: string };
export type SecureSecretStorage = {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
	removeItem(key: string): Promise<void>;
};

export class LocalSecretDatabase extends Dexie {
	secrets!: EntityTable<SecretRow, 'id'>;

	constructor(name = 'self-improvement-secrets') {
		super(name);
		this.version(1).stores({ secrets: 'id' });
	}
}

export class LocalSecretStore {
	private operations: Promise<void> = Promise.resolve();
	constructor(
		private readonly database = new LocalSecretDatabase(),
		private readonly secureStorage: SecureSecretStorage = SecureStorage,
		private readonly useSecureStorage = isNativeAndroid
	) {}

	async openRouterApiKey() {
		return this.exclusive(() => this.readOpenRouterApiKey());
	}

	private async readOpenRouterApiKey() {
		if (!this.useSecureStorage())
			return (await this.database.secrets.get(OPENROUTER_KEY_ID))?.value ?? '';
		const secureValue = (await this.secureStorage.getItem(OPENROUTER_KEY_ID)) ?? '';
		if (secureValue) {
			await this.database.secrets.delete(OPENROUTER_KEY_ID);
			return secureValue;
		}
		const legacyValue = (await this.database.secrets.get(OPENROUTER_KEY_ID))?.value ?? '';
		if (!legacyValue) return '';
		await this.secureStorage.setItem(OPENROUTER_KEY_ID, legacyValue);
		if ((await this.secureStorage.getItem(OPENROUTER_KEY_ID)) !== legacyValue) {
			throw new Error('Could not verify the migrated OpenRouter API key.');
		}
		await this.database.secrets.delete(OPENROUTER_KEY_ID);
		return legacyValue;
	}

	async saveOpenRouterApiKey(apiKey: string) {
		const value = apiKey.trim();
		if (!value) throw new Error('Enter an OpenRouter API key.');
		return this.exclusive(async () => {
			if (!this.useSecureStorage())
				return this.database.secrets.put({ id: OPENROUTER_KEY_ID, value });
			await this.secureStorage.setItem(OPENROUTER_KEY_ID, value);
			if ((await this.secureStorage.getItem(OPENROUTER_KEY_ID)) !== value) {
				throw new Error('Could not verify the saved OpenRouter API key.');
			}
			await this.database.secrets.delete(OPENROUTER_KEY_ID);
		});
	}

	async clearOpenRouterApiKey() {
		return this.exclusive(async () => {
			await this.database.secrets.delete(OPENROUTER_KEY_ID);
			if (this.useSecureStorage()) await this.secureStorage.removeItem(OPENROUTER_KEY_ID);
		});
	}

	async deleteDatabase() {
		await this.operations;
		this.database.close();
		await this.database.delete();
	}

	private exclusive<T>(operation: () => Promise<T>) {
		const result = this.operations.then(operation, operation);
		this.operations = result.then(
			() => undefined,
			() => undefined
		);
		return result;
	}
}

export const localSecretStore = new LocalSecretStore();
