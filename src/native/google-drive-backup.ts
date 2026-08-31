import { FilePicker, type PickedFile } from '@capawesome/capacitor-file-picker';
import { registerPlugin } from '@capacitor/core';
import { recordAchievementEvents } from '$lib/api';
import {
	backupFileName,
	createBackupEnvelope,
	isAutomaticBackupDue,
	parseBackupJson,
	restoreBackupEnvelope,
	UnsupportedBackupVersionError,
	type BackupEnvelope
} from '$lib/local/backup';
import { isNativeAndroid, requireNativeAndroid } from './platform';

const MAX_IMPORT_BYTES = 25 * 1_024 * 1_024;

export type GoogleDriveBackupStatus = {
	configured: boolean;
	lastSuccessAt?: string;
	lastFailureAt?: string;
	lastFailureMessage?: string;
};

type BackupWriteResult = { fileName: string; lastSuccessAt: string };
type BackupContents = { contents: string; createdAt: string };

interface AndroidBackupPlugin {
	configure(options: { treeUri: string }): Promise<GoogleDriveBackupStatus>;
	getStatus(): Promise<GoogleDriveBackupStatus>;
	writeBackup(options: BackupContents): Promise<BackupWriteResult>;
	exportFile(options: BackupContents): Promise<{ fileName: string }>;
	readFile(options: { uri: string; maxBytes: number }): Promise<{ contents: string }>;
	recordFailure(options: { failedAt: string; message: string }): Promise<void>;
}

const AndroidBackup = registerPlugin<AndroidBackupPlugin>('AndroidBackup');
let scheduledBackup: Promise<void> | null = null;

export class BackupCancelledError extends Error {}
export class InvalidBackupError extends Error {}

export async function chooseGoogleDriveFolder() {
	requireNativeAndroid();
	try {
		const { path } = await FilePicker.pickDirectory();
		const status = await AndroidBackup.configure({ treeUri: path });
		if (status.configured) await recordAchievementEvents('setup-drive-folder-configured');
		return status;
	} catch (cause) {
		throw pickerError(cause);
	}
}

export async function getGoogleDriveBackupStatus() {
	requireNativeAndroid();
	return AndroidBackup.getStatus();
}

export async function backUpNowToGoogleDrive() {
	requireNativeAndroid();
	const status = await AndroidBackup.getStatus();
	if (!status.configured) throw new Error('Choose a Google Drive folder first.');
	try {
		await writeGoogleDriveBackup();
		return AndroidBackup.getStatus();
	} catch (cause) {
		await recordFailure(cause);
		throw cause;
	}
}

export function runScheduledGoogleDriveBackup() {
	if (!isNativeAndroid()) return Promise.resolve();
	if (scheduledBackup) return scheduledBackup;
	scheduledBackup = runScheduledBackup().finally(() => (scheduledBackup = null));
	return scheduledBackup;
}

export async function exportBackupFile() {
	const envelope = await createBackupEnvelope();
	const contents = JSON.stringify(envelope);
	if (isNativeAndroid()) return exportNativeFile(envelope, contents);
	downloadBrowserFile(envelope, contents);
}

export async function pickBackupFile() {
	let file: PickedFile;
	try {
		const result = await FilePicker.pickFiles({
			types: ['application/json'],
			limit: 1
		});
		file = result.files[0];
	} catch (cause) {
		throw pickerError(cause);
	}
	if (!file) throw new BackupCancelledError('No backup file was selected.');
	return parsePickedFile(file);
}

export function restoreBackup(envelope: BackupEnvelope) {
	return restoreBackupEnvelope(envelope);
}

async function runScheduledBackup() {
	try {
		const status = await AndroidBackup.getStatus();
		if (!status.configured || !isAutomaticBackupDue(status.lastSuccessAt)) return;
		await writeGoogleDriveBackup();
	} catch (cause) {
		await recordFailure(cause);
	}
}

async function writeGoogleDriveBackup() {
	const envelope = await createBackupEnvelope();
	const result = await AndroidBackup.writeBackup({
		contents: JSON.stringify(envelope),
		createdAt: envelope.createdAt
	});
	await recordAchievementEvents('event-first-backup');
	return result;
}

async function exportNativeFile(envelope: BackupEnvelope, contents: string) {
	try {
		return await AndroidBackup.exportFile({ contents, createdAt: envelope.createdAt });
	} catch (cause) {
		throw pickerError(cause);
	}
}

function downloadBrowserFile(envelope: BackupEnvelope, contents: string) {
	const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = backupFileName(envelope.createdAt);
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url));
}

async function parsePickedFile(file: PickedFile) {
	if (file.size > MAX_IMPORT_BYTES) throw new InvalidBackupError('The backup file is too large.');
	try {
		return parseBackupJson(await pickedFileText(file));
	} catch (cause) {
		if (cause instanceof InvalidBackupError) throw cause;
		if (cause instanceof UnsupportedBackupVersionError) throw new InvalidBackupError(cause.message);
		throw new InvalidBackupError('This is not a valid Self Improvement backup.');
	}
}

async function pickedFileText(file: PickedFile) {
	if (file.blob) return file.blob.text();
	if (!file.path) throw new InvalidBackupError('The selected backup could not be read.');
	return (await AndroidBackup.readFile({ uri: file.path, maxBytes: MAX_IMPORT_BYTES })).contents;
}

function pickerError(cause: unknown) {
	const message = errorMessage(cause);
	if (/cancel/i.test(message)) return new BackupCancelledError(message);
	return cause instanceof Error ? cause : new Error(message);
}

async function recordFailure(cause: unknown) {
	try {
		await AndroidBackup.recordFailure({
			failedAt: new Date().toISOString(),
			message: errorMessage(cause)
		});
	} catch {
		return;
	}
}

function errorMessage(cause: unknown) {
	return cause instanceof Error ? cause.message : 'Google Drive backup failed.';
}
