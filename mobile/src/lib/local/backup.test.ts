import { describe, expect, it } from 'vitest';
import {
	BACKUP_ENVELOPE_VERSION,
	BACKUP_INTERVAL_MS,
	backupFileName,
	isAutomaticBackupDue,
	validateBackupEnvelope
} from './backup';
import { createDefaultAppState } from './state';

const createdAt = '2026-03-21T12:34:56.789Z';

function envelope() {
	return {
		version: BACKUP_ENVELOPE_VERSION,
		createdAt,
		state: createDefaultAppState(new Date(createdAt))
	};
}

describe('backup envelope', () => {
	it('validates the envelope and nested local state', () => {
		expect(validateBackupEnvelope(envelope())).toEqual(envelope());
		expect(() => validateBackupEnvelope({ ...envelope(), version: 2 })).toThrow();
		expect(() =>
			validateBackupEnvelope({ ...envelope(), state: { ...envelope().state, version: 2 } })
		).toThrow();
	});

	it('uses a deterministic timestamped JSON file name', () => {
		expect(backupFileName(createdAt)).toBe('self-improvement-backup-2026-03-21T12-34-56-789Z.json');
	});
});

describe('automatic backup scheduling', () => {
	const now = new Date('2026-03-22T12:34:56.789Z');

	it('is due without a valid previous success or after 24 hours', () => {
		expect(isAutomaticBackupDue(undefined, now)).toBe(true);
		expect(isAutomaticBackupDue('not-a-date', now)).toBe(true);
		expect(
			isAutomaticBackupDue(new Date(now.getTime() - BACKUP_INTERVAL_MS).toISOString(), now)
		).toBe(true);
	});

	it('is not due less than 24 hours after success', () => {
		const recent = new Date(now.getTime() - BACKUP_INTERVAL_MS + 1).toISOString();
		expect(isAutomaticBackupDue(recent, now)).toBe(false);
	});
});
