<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Info,
		LoaderCircle,
		RefreshCw,
		ShieldAlert,
		Smartphone,
		TriangleAlert
	} from '@lucide/svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import ConnectionCard from './components/ConnectionCard.svelte';
	import MobileButton from './components/MobileButton.svelte';
	import PermissionCards from './components/PermissionCards.svelte';
	import TrackerStatus from './components/TrackerStatus.svelte';
	import { SyncFailure } from './domain/errors';
	import { TRACKER_IDS, type CompanionStatus, type PairingCredentials } from './domain/model';
	import { DeviceTimeZoneHandshake, parsePairingCode } from './domain/pairing';
	import { ResumeSyncQueue } from './domain/resume-sync-queue';
	import { createEmptyStatus } from './domain/status';
	import { SyncCoordinator } from './domain/sync-coordinator';
	import { listenForResume } from './native/app';
	import { scanPairingQrCode } from './native/barcode';
	import { AndroidHealthAdapter } from './native/health';
	import { capacitorRequest } from './native/http';
	import { createNativeTrackerJobs } from './native/jobs';
	import { isNativeAndroid } from './native/platform';
	import { SecureCompanionRepository } from './native/secure-repository';
	import { AndroidUsageAdapter } from './native/usage';

	const supported = isNativeAndroid();
	const repository = new SecureCompanionRepository();
	const health = new AndroidHealthAdapter();
	const usage = new AndroidUsageAdapter();
	const coordinator = new SyncCoordinator(repository, createNativeTrackerJobs(health, usage));
	const timeZoneHandshake = new DeviceTimeZoneHandshake(capacitorRequest);
	const resumeSyncQueue = new ResumeSyncQueue();

	let pairing = $state<PairingCredentials | null>(null);
	let status = $state<CompanionStatus>(createEmptyStatus());
	let healthAvailable = $state<boolean | null>(null);
	let healthAvailabilityReason = $state('');
	let busy = $state(false);
	let initialized = $state(!supported);
	let actionError = $state('');
	let latestOverall = $state<'success' | 'partial' | 'failed' | 'idle'>('idle');
	let removeResumeListener = () => {};

	const successfulTrackers = $derived(
		TRACKER_IDS.filter((tracker) => status.trackers[tracker].outcome === 'success').length
	);
	const failedTrackers = $derived(
		TRACKER_IDS.filter((tracker) => status.trackers[tracker].outcome === 'failed').length
	);

	onMount(() => {
		if (!supported) return;
		void initialize();
		void listenForResume(syncOnResume)
			.then((remove) => (removeResumeListener = remove))
			.catch(() => (actionError = 'Foreground sync could not be prepared.'));
		return () => removeResumeListener();
	});

	async function initialize() {
		await runAction(async () => {
			[pairing, status] = await Promise.all([repository.loadPairing(), repository.loadStatus()]);
			await synchronizeDeviceTimeZone();
			await refreshPermissions();
			if (pairing) await syncStale();
		}, 'The secure companion state could not be opened.');
		initialized = true;
	}

	async function pairDevice() {
		await runAction(async () => {
			const scannedPairing = parsePairingCode(await scanPairingQrCode());
			const connectedPairing = await timeZoneHandshake.connect(scannedPairing);
			await saveNewConnection(connectedPairing);
			pairing = connectedPairing;
			status = createEmptyStatus();
			latestOverall = 'idle';
			await refreshPermissions();
		}, 'The pairing scanner could not complete.');
	}

	async function disconnect() {
		await runAction(async () => {
			await repository.disconnect();
			pairing = null;
			status = createEmptyStatus();
			healthAvailable = null;
			healthAvailabilityReason = '';
			latestOverall = 'idle';
		}, 'The secure connection could not be removed.');
	}

	async function requestHealthPermissions() {
		await runAction(async () => {
			await health.requestReadPermissions();
			await synchronizeDeviceTimeZone();
			await refreshPermissions();
			if (pairing) await syncStale();
		}, 'Health Connect permission could not be requested.');
	}

	async function manualSync() {
		if (!pairing) return;
		await runAction(async () => {
			await synchronizeDeviceTimeZone();
			latestOverall = (await coordinator.syncAll()).overall;
			status = await repository.loadStatus();
		}, 'Synchronization could not start.');
	}

	async function syncOnResume() {
		if (busy) {
			resumeSyncQueue.enqueue();
			return;
		}
		if (!pairing) return;
		await runAction(async () => {
			await synchronizeDeviceTimeZone();
			await refreshPermissions();
			if (pairing) await syncStale();
		}, 'Foreground synchronization will retry later.');
	}

	async function syncStale() {
		latestOverall = (await coordinator.syncStale()).overall;
		status = await repository.loadStatus();
	}

	async function refreshPermissions() {
		const availability = await health.isAvailable();
		healthAvailable = availability.available;
		healthAvailabilityReason = availability.reason ?? '';
		const unavailable = Promise.resolve({ state: 'unavailable' as const });
		const [steps, sleep, screenTime] = await Promise.all([
			availability.available ? health.checkPermission('steps') : unavailable,
			availability.available ? health.checkPermission('sleep') : unavailable,
			usage.checkPermission()
		]);
		status = statusWithPermissions(status, steps.state, sleep.state, screenTime.state);
		await repository.saveStatus(status);
	}

	async function synchronizeDeviceTimeZone() {
		if (!pairing) return;
		const synchronizedPairing = await timeZoneHandshake.refresh(pairing);
		if (synchronizedPairing === pairing) return;
		await repository.savePairing(synchronizedPairing);
		pairing = synchronizedPairing;
	}

	async function saveNewConnection(connectedPairing: PairingCredentials) {
		try {
			await repository.savePairing(connectedPairing);
			await repository.saveStatus(createEmptyStatus());
		} catch (cause) {
			await repository.disconnect().catch(() => undefined);
			throw cause;
		}
	}

	async function openHealthSettings() {
		await runAction(() => health.openSettings(), 'Health Connect settings could not be opened.');
	}

	async function openPrivacyPolicy() {
		await runAction(() => health.showPrivacyPolicy(), 'The privacy policy could not be opened.');
	}

	async function openUsageSettings() {
		await runAction(() => usage.openSettings(), 'Usage Access settings could not be opened.');
	}

	async function runAction(action: () => Promise<void>, fallbackMessage: string) {
		if (busy) return;
		busy = true;
		actionError = '';
		try {
			await action();
		} catch (cause) {
			actionError = safeMessage(cause, fallbackMessage);
		} finally {
			busy = false;
			runQueuedResumeSync();
		}
	}

	function runQueuedResumeSync() {
		if (resumeSyncQueue.dequeue()) void syncOnResume();
	}

	function statusWithPermissions(
		current: CompanionStatus,
		steps: CompanionStatus['trackers']['steps']['permission'],
		sleep: CompanionStatus['trackers']['sleep']['permission'],
		screenTime: CompanionStatus['trackers']['screenTime']['permission']
	): CompanionStatus {
		return {
			version: 1,
			trackers: {
				steps: { ...current.trackers.steps, permission: steps },
				sleep: { ...current.trackers.sleep, permission: sleep },
				screenTime: { ...current.trackers.screenTime, permission: screenTime }
			}
		};
	}

	function safeMessage(cause: unknown, fallback: string) {
		return cause instanceof SyncFailure ? cause.message : fallback;
	}
</script>

<svelte:head>
	<title>Self Improvement Companion</title>
	<meta
		name="description"
		content="Securely sync Android Health Connect and screen-time data to Self Improvement."
	/>
</svelte:head>

{#if !supported}
	<main class="mx-auto flex min-h-svh w-full max-w-xl items-center px-5 py-10">
		<Card class="w-full text-center">
			<CardHeader class="items-center">
				<div class="flex size-14 items-center justify-center rounded-3xl bg-(--text)/6">
					<ShieldAlert class="size-7" aria-hidden="true" />
				</div>
				<CardTitle class="mt-2 text-xl">Android app required</CardTitle>
				<CardDescription>
					This screen only works inside the native Android companion. No credentials or status are
					stored when it runs in a browser.
				</CardDescription>
			</CardHeader>
		</Card>
	</main>
{:else}
	<main
		class="mx-auto min-h-svh w-full max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6"
	>
		<header class="flex items-start justify-between gap-4 py-5">
			<div class="flex items-center gap-3">
				<div class="flex size-11 items-center justify-center rounded-3xl bg-(--text) text-(--bg)">
					<Smartphone class="size-5" aria-hidden="true" />
				</div>
				<div>
					<p class="text-xs font-medium tracking-wide text-(--text)/48 uppercase">
						Self Improvement
					</p>
					<h1 class="text-xl font-medium tracking-[-0.04em]">Android companion</h1>
				</div>
			</div>
			{#if pairing}
				<MobileButton size="sm" disabled={busy} onclick={manualSync}>
					<RefreshCw class={busy ? 'animate-spin' : undefined} aria-hidden="true" /> Sync now
				</MobileButton>
			{/if}
		</header>

		{#if !initialized}
			<div class="flex items-center justify-center py-24 text-(--text)/48">
				<LoaderCircle class="size-7 animate-spin" aria-label="Loading companion status" />
			</div>
		{:else}
			<div class="space-y-4">
				{#if actionError}
					<Alert variant="destructive">
						<TriangleAlert aria-hidden="true" />
						<AlertTitle>Action needed</AlertTitle>
						<AlertDescription>{actionError}</AlertDescription>
					</Alert>
				{/if}

				{#if pairing && (latestOverall === 'partial' || (successfulTrackers > 0 && failedTrackers > 0))}
					<Alert>
						<Info aria-hidden="true" />
						<AlertTitle>Partially synced</AlertTitle>
						<AlertDescription>
							{successfulTrackers} tracker{successfulTrackers === 1 ? '' : 's'} succeeded and
							{failedTrackers} need{failedTrackers === 1 ? 's' : ''} attention. Successful trackers remain
							saved independently.
						</AlertDescription>
					</Alert>
				{:else if pairing && (latestOverall === 'failed' || failedTrackers > 0)}
					<Alert variant="destructive">
						<TriangleAlert aria-hidden="true" />
						<AlertTitle>Sync needs attention</AlertTitle>
						<AlertDescription>
							No tracker completed in the latest attempt. Review permissions and tracker errors,
							then retry.
						</AlertDescription>
					</Alert>
				{:else if pairing && latestOverall === 'success'}
					<div
						class="flex items-center justify-between rounded-3xl bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
					>
						<span class="font-medium">All trackers synced</span><Badge>Latest 7 days</Badge>
					</div>
				{/if}

				<ConnectionCard {pairing} {busy} onPair={pairDevice} onDisconnect={disconnect} />

				{#if pairing}
					<PermissionCards
						{healthAvailable}
						{healthAvailabilityReason}
						stepsPermission={status.trackers.steps.permission}
						sleepPermission={status.trackers.sleep.permission}
						usagePermission={status.trackers.screenTime.permission}
						{busy}
						onRequestHealth={requestHealthPermissions}
						onHealthSettings={openHealthSettings}
						onPrivacyPolicy={openPrivacyPolicy}
						onUsageSettings={openUsageSettings}
					/>

					<section class="space-y-3" aria-labelledby="tracker-status-heading">
						<div class="flex items-end justify-between gap-3 px-1 pt-2">
							<div>
								<h2 id="tracker-status-heading" class="text-lg font-medium">Tracker status</h2>
								<p class="text-sm text-(--text)/48">
									Each tracker uploads and retries independently.
								</p>
							</div>
							{#if busy}<Badge>Syncing</Badge>{/if}
						</div>
						{#each TRACKER_IDS as tracker (tracker)}
							<TrackerStatus
								{tracker}
								status={status.trackers[tracker]}
								timeZone={pairing.timeZone}
							/>
						{/each}
					</section>

					<Alert>
						<Info aria-hidden="true" />
						<AlertTitle>Foreground fallback</AlertTitle>
						<AlertDescription>
							Android background execution is best effort, and this release does not configure a
							WorkManager schedule. Stale trackers retry whenever the app returns to the foreground;
							use Sync now if Android delays delivery.
						</AlertDescription>
					</Alert>
				{/if}
			</div>
		{/if}
	</main>
{/if}
