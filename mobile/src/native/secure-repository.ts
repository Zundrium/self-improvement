import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { AppCredentials, MobileSyncStatus } from '../domain/model';
import { createEmptyStatus, parseStoredStatus } from '../domain/status';
import { isNativeAndroid } from './platform';

const CREDENTIALS_KEY = 'self-improvement-session-v1';
const STATUS_KEY = 'self-improvement-sync-status-v1';

export interface MobileRepository {
	loadCredentials(): Promise<AppCredentials | null>;
	saveCredentials(credentials: AppCredentials): Promise<void>;
	loadStatus(): Promise<MobileSyncStatus>;
	saveStatus(status: MobileSyncStatus): Promise<void>;
	disconnect(): Promise<void>;
}

export class SecureMobileRepository implements MobileRepository {
	async loadCredentials() {
		const serialized = await getItem(CREDENTIALS_KEY);
		return serialized ? parseCredentials(serialized) : null;
	}

	async saveCredentials(credentials: AppCredentials) {
		await setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
	}

	async loadStatus() {
		const serialized = await getItem(STATUS_KEY);
		return serialized ? storedStatus(serialized) : createEmptyStatus();
	}

	async saveStatus(status: MobileSyncStatus) {
		await setItem(STATUS_KEY, JSON.stringify(parseStoredStatus(status)));
	}

	async disconnect() {
		await Promise.all([removeItem(CREDENTIALS_KEY), removeItem(STATUS_KEY)]);
	}
}

function parseCredentials(serialized: string): AppCredentials | null {
	try {
		const value = JSON.parse(serialized) as Record<string, unknown>;
		if (!validUrl(value.apiBaseUrl) || typeof value.token !== 'string' || !value.token) return null;
		if (typeof value.timeZone !== 'string' || !value.timeZone) return null;
		return { apiBaseUrl: value.apiBaseUrl as string, token: value.token, timeZone: value.timeZone };
	} catch {
		return null;
	}
}

function validUrl(value: unknown) {
	try {
		return typeof value === 'string' && ['http:', 'https:'].includes(new URL(value).protocol);
	} catch {
		return false;
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

async function removeItem(key: string) {
	if (isNativeAndroid()) await SecureStorage.removeItem(key);
	else globalThis.localStorage?.removeItem(key);
}
