import { z } from 'zod';
import {
	exportLocalAppState,
	replaceLocalAppState,
	validateLocalAppState,
	type LocalAppState
} from './state';

export const BACKUP_ENVELOPE_VERSION = 2 as const;
export const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1_000;
export const BACKUP_FILE_PREFIX = 'self-improvement-backup-';

const envelopeSchema = z.strictObject({
	version: z.literal(BACKUP_ENVELOPE_VERSION),
	createdAt: z.iso.datetime(),
	state: z.unknown()
});

export type BackupEnvelope = {
	version: typeof BACKUP_ENVELOPE_VERSION;
	createdAt: string;
	state: LocalAppState;
};

export class UnsupportedBackupVersionError extends Error {}

export async function createBackupEnvelope(now = new Date()): Promise<BackupEnvelope> {
	return validateBackupEnvelope({
		version: BACKUP_ENVELOPE_VERSION,
		createdAt: now.toISOString(),
		state: await exportLocalAppState()
	});
}

export function validateBackupEnvelope(input: unknown): BackupEnvelope {
	const version = backupVersion(input);
	if (version === 1)
		throw new UnsupportedBackupVersionError(
			'Backup version 1 is no longer supported. Create a new version 2 backup.'
		);
	if (version !== BACKUP_ENVELOPE_VERSION)
		throw new UnsupportedBackupVersionError(`Unsupported backup version: ${String(version)}`);
	const envelope = envelopeSchema.parse(input);
	return { ...envelope, state: validateLocalAppState(envelope.state) };
}

export function parseBackupJson(serialized: string) {
	return validateBackupEnvelope(JSON.parse(serialized) as unknown);
}

export function restoreBackupEnvelope(envelope: BackupEnvelope) {
	const validated = validateBackupEnvelope(envelope);
	return replaceLocalAppState(validated.state);
}

export function isAutomaticBackupDue(lastSuccessAt: string | null | undefined, now = new Date()) {
	if (!lastSuccessAt) return true;
	const lastSuccessTime = Date.parse(lastSuccessAt);
	if (!Number.isFinite(lastSuccessTime)) return true;
	return now.getTime() - lastSuccessTime >= BACKUP_INTERVAL_MS;
}

export function backupFileName(createdAt: string) {
	const timestamp = new Date(createdAt).toISOString().replaceAll(':', '-').replace('.', '-');
	return `${BACKUP_FILE_PREFIX}${timestamp}.json`;
}

function backupVersion(input: unknown) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
	return (input as { version?: unknown }).version;
}
