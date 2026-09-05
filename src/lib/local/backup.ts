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
export const BACKUP_MAX_BYTES = 25 * 1_024 * 1_024;

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
	const state = validateLocalAppState(envelope.state);
	validateBackupRelationships(state);
	return { ...envelope, state };
}

export function parseBackupJson(serialized: string) {
	assertBackupSize(serialized);
	return validateBackupEnvelope(JSON.parse(serialized) as unknown);
}

export function serializeBackupEnvelope(envelope: BackupEnvelope) {
	const serialized = JSON.stringify(validateBackupEnvelope(envelope));
	assertBackupSize(serialized);
	return serialized;
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

function assertBackupSize(serialized: string) {
	if (new TextEncoder().encode(serialized).byteLength > BACKUP_MAX_BYTES)
		throw new Error('The backup is too large to export or restore.');
}

function validateBackupRelationships(state: LocalAppState) {
	uniqueIds(
		state.nutrition.entries.map(({ id }) => id),
		'nutrition entry'
	);
	const meals = state.nutrition.entries.flatMap(({ meals }) => meals);
	uniqueIds(
		meals.map(({ id }) => id),
		'nutrition meal'
	);
	uniqueIds(
		meals.flatMap(({ ingredients }) => ingredients.map(({ id }) => id)),
		'nutrition ingredient'
	);
	uniqueIds(
		state.steps.days.map(({ date }) => date),
		'steps date'
	);
	uniqueIds(state.nutrition.fastingDates, 'nutrition fasting date');
	for (const meal of meals) {
		if (
			meal.imageDataUrl &&
			!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(meal.imageDataUrl)
		)
			throw new Error(`Invalid nutrition media for meal ${meal.id}.`);
	}
}

function uniqueIds(values: readonly string[], label: string) {
	if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label} identity.`);
}
