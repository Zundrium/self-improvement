import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { MobileSyncStatus, SyncContext } from '../domain/model';
import { parseStoredStatus } from '../domain/status';
import { localAppStore, type LocalAppStore } from '../lib/local/state';
import { isNativeAndroid } from './platform';

const OBSOLETE_STATUS_KEYS = [
	'self-improvement-local-sync-status-v1',
	'self-improvement-session-v1',
	'self-improvement-sync-status-v1'
];
let cleanupPromise: Promise<void> | undefined;

export interface MobileRepository {
	loadSyncContext(): Promise<SyncContext>;
	loadStatus(): Promise<MobileSyncStatus>;
	saveStatus(status: MobileSyncStatus): Promise<void>;
}

export class DatabaseMobileRepository implements MobileRepository {
	constructor(private readonly store: LocalAppStore = localAppStore) {}

	async loadSyncContext() {
		return { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
	}

	async loadStatus() {
		const status = await this.store.loadSyncStatus();
		await clearObsoleteStatus();
		return status;
	}

	async saveStatus(status: MobileSyncStatus) {
		await this.store.saveSyncStatus(parseStoredStatus(status));
		await clearObsoleteStatus();
	}
}

export class SecureMobileRepository extends DatabaseMobileRepository {}

function clearObsoleteStatus() {
	cleanupPromise ??= Promise.all(OBSOLETE_STATUS_KEYS.map(removeItem)).then(() => undefined);
	return cleanupPromise;
}

async function removeItem(key: string) {
	try {
		if (isNativeAndroid()) await SecureStorage.removeItem(key);
		else globalThis.localStorage?.removeItem(key);
	} catch {}
}
