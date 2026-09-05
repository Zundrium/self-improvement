import { appMaintenance } from '$lib/app/maintenance';
import { LocalNotifications } from '@capacitor/local-notifications';
import { apiRequest } from '$lib/api';
import type { SleepData, SleepSettingsData } from '$lib/api-types';
import { isNativeAndroid } from '$native/platform';

const REMINDER_ID = 22_301_500;
const CHANNEL_ID = 'bedtime-reminders';
const REMINDER_MINUTES = 15;

export async function requestBedtimeReminderPermission() {
	if (!isNativeAndroid()) return false;
	const permission = await LocalNotifications.requestPermissions();
	return permission.display === 'granted';
}

export function applyBedtimeReminder(settings: SleepSettingsData) {
	return appMaintenance.run(() => applyBedtimeReminderDuringRestore(settings));
}

// The restore coordinator has already drained normal work and holds maintenance.
export async function applyBedtimeReminderDuringRestore(settings: SleepSettingsData) {
	if (!isNativeAndroid()) return;
	if (!settings.remindersEnabled) return cancelReminder();
	const permission = await LocalNotifications.checkPermissions();
	if (permission.display !== 'granted') return cancelReminder();
	await scheduleReminder(settings);
}

export function rescheduleBedtimeReminderFromApi() {
	return appMaintenance.run(rescheduleBedtimeReminder);
}

async function rescheduleBedtimeReminder() {
	if (!isNativeAndroid()) return;
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const data = await apiRequest<SleepData>(
		`/api/app/sleep?timeZone=${encodeURIComponent(timeZone)}`
	);
	await applyBedtimeReminderDuringRestore(data.settings);
}

async function scheduleReminder(settings: SleepSettingsData) {
	const reminder = nextReminderAt(settings.bedtime);
	await cancelReminder();
	await LocalNotifications.createChannel({
		id: CHANNEL_ID,
		name: 'Bedtime reminders',
		description: 'A gentle reminder before your configured bedtime.',
		importance: 3
	});
	await LocalNotifications.schedule({
		notifications: [
			{
				id: REMINDER_ID,
				title: 'Bedtime in 15 minutes',
				body: 'Wrap up selected apps and get ready for bed.',
				channelId: CHANNEL_ID,
				schedule: { on: { hour: reminder.getHours(), minute: reminder.getMinutes() } },
				isExactNotification: false,
				autoCancel: true
			}
		]
	});
}

async function cancelReminder() {
	await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
}

export function nextReminderAt(bedtime: string, now = new Date()) {
	const [hour, minute] = bedtime.split(':').map(Number);
	const reminder = new Date(now);
	reminder.setHours(hour, minute - REMINDER_MINUTES, 0, 0);
	if (reminder <= now) reminder.setDate(reminder.getDate() + 1);
	return reminder;
}
