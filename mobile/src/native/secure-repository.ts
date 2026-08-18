import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { CompanionStatus, PairingCredentials } from '../domain/model';
import { parseStoredPairing, serializePairing } from '../domain/pairing';
import { createEmptyStatus, parseStoredStatus } from '../domain/status';
import { requireNativeAndroid } from './platform';

const PAIRING_KEY = 'android-companion-pairing-v1';
const STATUS_KEY = 'android-companion-status-v1';

export interface CompanionRepository {
	loadPairing(): Promise<PairingCredentials | null>;
	savePairing(pairing: PairingCredentials): Promise<void>;
	loadStatus(): Promise<CompanionStatus>;
	saveStatus(status: CompanionStatus): Promise<void>;
	disconnect(): Promise<void>;
}

export class SecureCompanionRepository implements CompanionRepository {
	async loadPairing() {
		const serialized = await getSecureItem(PAIRING_KEY);
		return serialized ? parseStoredPairing(serialized) : null;
	}

	async savePairing(pairing: PairingCredentials) {
		await setSecureItem(PAIRING_KEY, serializePairing(pairing));
	}

	async loadStatus() {
		const serialized = await getSecureItem(STATUS_KEY);
		if (!serialized) return createEmptyStatus();
		return storedStatus(serialized);
	}

	async saveStatus(status: CompanionStatus) {
		const validated = parseStoredStatus(status);
		await setSecureItem(STATUS_KEY, JSON.stringify(validated));
	}

	async disconnect() {
		requireNativeAndroid();
		await Promise.all([
			SecureStorage.removeItem(PAIRING_KEY),
			SecureStorage.removeItem(STATUS_KEY)
		]);
	}
}

async function getSecureItem(key: string) {
	requireNativeAndroid();
	return SecureStorage.getItem(key);
}

async function setSecureItem(key: string, value: string) {
	requireNativeAndroid();
	await SecureStorage.setItem(key, value);
}

function storedStatus(serialized: string) {
	try {
		return parseStoredStatus(JSON.parse(serialized) as unknown);
	} catch {
		return createEmptyStatus();
	}
}
