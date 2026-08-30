<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Cloud, Download, FolderOpen, RefreshCw, Upload } from '@lucide/svelte';
	import { recordAchievementEvents } from '$lib/api';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle
	} from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { BackupEnvelope } from '$lib/local/backup';
	import {
		BackupCancelledError,
		backUpNowToGoogleDrive,
		chooseGoogleDriveFolder,
		exportBackupFile,
		getGoogleDriveBackupStatus,
		pickBackupFile,
		restoreBackup,
		type GoogleDriveBackupStatus
	} from '$native/google-drive-backup';
	import { isNativeAndroid } from '$native/platform';

	const nativeAndroid = isNativeAndroid();
	let status = $state<GoogleDriveBackupStatus>({ configured: false });
	let pendingRestore = $state<BackupEnvelope | null>(null);
	let restoreOpen = $state(false);
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);

	onMount(() => {
		if (!nativeAndroid) return;
		void loadStatus();
	});

	async function loadStatus() {
		try {
			status = await getGoogleDriveBackupStatus();
			await recordAchievementEvents(
				...(status.configured ? ['setup-drive-folder-configured'] : []),
				...(status.lastSuccessAt ? ['event-first-backup'] : [])
			);
		} catch {
			message = 'Google Drive backup status could not be read.';
			failed = true;
		}
	}

	async function chooseFolder() {
		await run(async () => {
			status = await chooseGoogleDriveFolder();
		}, 'Google Drive folder selected.');
	}

	async function backUpNow() {
		await run(async () => {
			status = await backUpNowToGoogleDrive();
		}, 'Backup saved to Google Drive.');
	}

	async function exportFile() {
		await run(exportBackupFile, 'Backup file exported.');
	}

	async function selectRestore() {
		await run(async () => {
			pendingRestore = await pickBackupFile();
			restoreOpen = true;
		});
	}

	async function confirmRestore() {
		const backup = pendingRestore;
		if (!backup) return;
		await run(async () => {
			await restoreBackup(backup);
			pendingRestore = null;
			await invalidateAll();
		}, 'Backup restored.');
	}

	async function run(action: () => Promise<unknown>, successMessage = '') {
		if (busy) return;
		busy = true;
		message = '';
		failed = false;
		try {
			await action();
			message = successMessage;
		} catch (cause) {
			if (!(cause instanceof BackupCancelledError)) showFailure(cause);
		} finally {
			busy = false;
		}
	}

	function showFailure(cause: unknown) {
		failed = true;
		message = cause instanceof Error ? cause.message : 'The backup action could not complete.';
	}

	function dateLabel(value: string | undefined, fallback: string) {
		return value ? new Date(value).toLocaleString() : fallback;
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2"><Cloud class="size-5" /> Data backup</CardTitle>
	</CardHeader>
	<CardContent class="space-y-5">
		<p class="text-sm leading-6 text-(--text)/64">
			Automatic backups run once per day when the Android app opens or resumes. Only the five newest
			backup files are kept in your selected Google Drive folder.
		</p>

		{#if message}
			<Alert variant={failed ? 'destructive' : 'default'}>
				<AlertDescription>{message}</AlertDescription>
			</Alert>
		{/if}
		{#if status.lastFailureMessage}
			<Alert variant="destructive">
				<AlertTitle>Last Google Drive backup failed</AlertTitle>
				<AlertDescription>
					{status.lastFailureMessage} · {dateLabel(status.lastFailureAt, 'Time unavailable')}
				</AlertDescription>
			</Alert>
		{/if}

		<div class="divide-y divide-(--text)/8">
			<div class="flex items-start justify-between gap-4 py-3 first:pt-0">
				<div>
					<p class="text-sm font-medium">Google Drive destination</p>
					<p class="text-xs text-(--text)/48">
						{nativeAndroid
							? status.configured
								? 'Folder access is saved on this device'
								: 'Choose a folder in Google Drive'
							: 'Available in the Android app'}
					</p>
				</div>
				<Badge
					>{nativeAndroid
						? status.configured
							? 'Selected'
							: 'Not selected'
						: 'Android only'}</Badge
				>
			</div>
			<div class="flex items-start justify-between gap-4 py-3">
				<div>
					<p class="text-sm font-medium">Daily automatic backup</p>
					<p class="text-xs text-(--text)/48">
						{dateLabel(status.lastSuccessAt, 'No successful backup yet')}
					</p>
				</div>
				<Badge>{nativeAndroid ? (status.configured ? 'On' : 'Off') : 'Android only'}</Badge>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<Button size="medium"
				type="button"
				variant="ghost"
				disabled={busy || !nativeAndroid}
				onclick={chooseFolder}
			>
				<FolderOpen class="size-4" /> Choose Google Drive folder
			</Button>
			<Button size="medium"
				type="button"
				disabled={busy || !nativeAndroid || !status.configured}
				onclick={backUpNow}
			>
				{#if busy}<Spinner class="size-4" />{:else}<RefreshCw class="size-4" />{/if} Back up now
			</Button>
			<Button size="medium" type="button" variant="ghost" disabled={busy} onclick={exportFile}>
				<Download class="size-4" /> Export file
			</Button>
			<Button size="medium" type="button" variant="ghost" disabled={busy} onclick={selectRestore}>
				<Upload class="size-4" /> Restore backup
			</Button>
		</div>
	</CardContent>
</Card>

<AlertDialog bind:open={restoreOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Replace all local data?</AlertDialogTitle>
			<AlertDialogDescription>
				Restoring this backup permanently replaces your current profile, settings, tracker history,
				and rewards on this device. This cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel size="medium">Keep current data</AlertDialogCancel>
			<AlertDialogAction size="medium"
				class="bg-red-600 text-white hover:bg-red-700"
				disabled={busy}
				onclick={confirmRestore}>Replace local data</AlertDialogAction
			>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
