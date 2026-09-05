import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BackupEnvelope } from '$lib/local/backup';

const operations = vi.hoisted(() => ({
	restore: vi.fn(async (_envelope: unknown) => {}),
	reset: vi.fn(),
	reminders: vi.fn(async (_settings: unknown) => {}),
	diagnostic: vi.fn()
}));
vi.mock('$lib/api', () => ({ resetApplicationCaches: operations.reset }));
vi.mock('$lib/local/backup', () => ({
	validateBackupEnvelope: (envelope: unknown) => envelope,
	restoreBackupEnvelope: operations.restore
}));
vi.mock('$native/bedtime-reminders', () => ({
	applyBedtimeReminderDuringRestore: operations.reminders
}));
vi.mock('./diagnostics', () => ({ recordDiagnostic: operations.diagnostic }));
import { restoreApplication } from './restore';

// Envelope validation is covered by backup.test.ts; this suite isolates post-commit work.
const envelope = { state: { sleep: { bedtime: '22:00' } } } as unknown as BackupEnvelope;

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe('application restore coordination', () => {
	it('still reapplies reminders when clearing an old session fails after commit', async () => {
		vi.stubGlobal('sessionStorage', {
			'meditation-session': 'old-session',
			removeItem() {
				throw new Error('Session storage unavailable');
			}
		});
		const result = await restoreApplication(envelope);
		expect(result.committed).toBe(true);
		expect(result.warnings).toEqual([
			'Your data was restored. Reload the app before resuming a previous session.'
		]);
		expect(operations.restore).toHaveBeenCalledWith(envelope);
		expect(operations.reset).toHaveBeenCalledOnce();
		expect(operations.reminders).toHaveBeenCalledWith(envelope.state.sleep);
		expect(operations.diagnostic).toHaveBeenCalledWith(
			expect.objectContaining({ category: 'storage', committed: true })
		);
	});

	it('does not reset caches or device reminders when replacement fails', async () => {
		operations.restore.mockRejectedValueOnce(new Error('Database write failed'));
		await expect(restoreApplication(envelope)).rejects.toThrow('Database write failed');
		expect(operations.reset).not.toHaveBeenCalled();
		expect(operations.reminders).not.toHaveBeenCalled();
	});
});
