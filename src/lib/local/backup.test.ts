import { describe, expect, it } from 'vitest';
import {
	BACKUP_ENVELOPE_VERSION,
	BACKUP_INTERVAL_MS,
	UnsupportedBackupVersionError,
	backupFileName,
	BACKUP_MAX_BYTES,
	isAutomaticBackupDue,
	serializeBackupEnvelope,
	validateBackupEnvelope
} from './backup';
import { createNutritionEntry } from './nutrition';
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
	it('refuses to serialize a backup larger than the restore limit', () => {
		const backup = envelope();
		backup.state.nutrition.entries = [
			createNutritionEntry({
				date: '2026-03-21',
				meals: [{ name: 'Meal', ingredients: [{ name: 'Food', calories: 1 }] }]
			})
		];
		backup.state.nutrition.entries[0].notes = 'x'.repeat(BACKUP_MAX_BYTES);
		expect(() => serializeBackupEnvelope(backup)).toThrow('too large to export or restore');
	});
	it('validates the v2 envelope and nested relational export model', () => {
		expect(validateBackupEnvelope(envelope())).toEqual(envelope());
		expect(() =>
			validateBackupEnvelope({ ...envelope(), state: { ...envelope().state, version: 1 } })
		).toThrow();
	});

	it('rejects v1 backups with a clear version error', () => {
		expect(() => validateBackupEnvelope({ ...envelope(), version: 1 })).toThrow(
			new UnsupportedBackupVersionError(
				'Backup version 1 is no longer supported. Create a new version 2 backup.'
			)
		);
	});

	it('restores photo-backed entries without reintroducing the duplicate thumbnail payload', () => {
		const backup = envelope();
		const imageDataUrl = 'data:image/jpeg;base64,YQ==';
		const entry = createNutritionEntry({
			date: '2026-03-21',
			meals: [{ name: 'Lunch', imageDataUrl, ingredients: [{ name: 'Rice', calories: 300 }] }]
		});
		entry.thumbnail = imageDataUrl;
		backup.state.nutrition.entries = [entry];

		const restored = validateBackupEnvelope(backup);

		expect(restored.state.nutrition.entries[0]).toMatchObject({
			thumbnail: '',
			meals: [{ imageDataUrl }]
		});
	});

	it('rejects duplicate nested identities and unresolved media references', () => {
		const backup = envelope();
		const entry = createNutritionEntry({
			date: '2026-03-21',
			meals: [{ name: 'Lunch', ingredients: [{ name: 'Rice', calories: 1 }] }]
		});
		backup.state.nutrition.entries = [entry, structuredClone(entry)];
		expect(() => validateBackupEnvelope(backup)).toThrow('Duplicate nutrition entry identity');

		backup.state.nutrition.entries = [entry];
		entry.meals[0].imageDataUrl = `stored-media:meal-${entry.meals[0].id}`;
		expect(() => validateBackupEnvelope(backup)).toThrow('Invalid nutrition media');
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
