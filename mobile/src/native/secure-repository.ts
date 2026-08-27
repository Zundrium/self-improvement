import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { MobileSyncStatus, SyncContext } from '../domain/model';
import { createEmptyStatus, parseStoredStatus } from '../domain/status';
import { isNativeAndroid } from './platform';

const STATUS_KEY = 'self-improvement-local-sync-status-v1';
const LEGACY_KEYS = ['self-improvement-session-v1', 'self-improvement-sync-status-v1'];
let cleanupPromise: Promise<void> | undefined;

export interface MobileRepository {
	loadSyncContext(): Promise<SyncContext>;
	loadStatus(): Promise<MobileSyncStatus>;
	saveStatus(status: MobileSyncStatus): Promise<void>;
}

export class SecureMobileRepository implements MobileRepository {
	async loadSyncContext() {
		return { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
	}

	async loadStatus() {
		await clearLegacyState();
		const serialized = await getItem(STATUS_KEY);
		return serialized ? storedStatus(serialized) : createEmptyStatus();
	}

	async saveStatus(status: MobileSyncStatus) {
		await clearLegacyState();
		await setItem(STATUS_KEY, JSON.stringify(parseStoredStatus(status)));
	}
}

function storedStatus(serialized: string) {
	try {
		return parseStoredStatus(JSON.parse(serialized) as unknown);
	} catch {
		return createEmptyStatus();
	}
}

async function getItem(key: string) {
	if (isNativeAndroid()) return SecureStorage.getItem(key);
	return globalThis.localStorage?.getItem(key) ?? null;
}

async function setItem(key: string, value: string) {
	if (isNativeAndroid()) await SecureStorage.setItem(key, value);
	else globalThis.localStorage?.setItem(key, value);
}

function clearLegacyState() {
	cleanupPromise ??= Promise.all(LEGACY_KEYS.map(removeItem)).then(() => undefined);
	return cleanupPromise;
}

async function removeItem(key: string) {
	try {
		if (isNativeAndroid()) await SecureStorage.removeItem(key);
		else globalThis.localStorage?.removeItem(key);
	} catch {
		return;
	}
}
