import { resetApplicationCaches } from '$lib/api';
import {
	restoreBackupEnvelope,
	validateBackupEnvelope,
	type BackupEnvelope
} from '$lib/local/backup';
import { applyBedtimeReminderDuringRestore } from '$native/bedtime-reminders';
import { appMaintenance } from './maintenance';
import { recordDiagnostic } from './diagnostics';

export const APP_RESTORED_EVENT = 'app:restored';

export async function restoreApplication(envelope: BackupEnvelope) {
	const validated = validateBackupEnvelope(envelope);
	return appMaintenance.exclusive(async () => {
		await restoreBackupEnvelope(validated);
		resetApplicationCaches();
		const warnings: string[] = [];
		try {
			clearSessionDrafts();
		} catch {
			warnings.push('Your data was restored. Reload the app before resuming a previous session.');
			recordDiagnostic({
				operation: 'restore',
				category: 'storage',
				committed: true,
				retryable: true
			});
		}
		try {
			await applyBedtimeReminderDuringRestore(validated.state.sleep);
		} catch {
			warnings.push(
				'Your data was restored. Device reminders could not be updated; retry them in Sleep settings.'
			);
			recordDiagnostic({
				operation: 'restore',
				category: 'native',
				committed: true,
				retryable: true
			});
		}
		return { committed: true as const, warnings };
	});
}

function clearSessionDrafts() {
	if (typeof sessionStorage === 'undefined') return;
	for (const key of Object.keys(sessionStorage)) {
		if (
			key.startsWith('guided-routine:') ||
			key === 'meditation-session' ||
			key === 'chores-session'
		)
			sessionStorage.removeItem(key);
	}
}
