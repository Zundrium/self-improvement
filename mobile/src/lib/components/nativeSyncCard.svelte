<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Activity, CircleHelp, RefreshCw, Settings, Shield, Smartphone } from '@lucide/svelte';
	import { mobileRepository } from '$lib/api';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { TRACKER_IDS, type MobileSyncStatus, type TrackerId } from '$domain/model';
	import { createEmptyStatus, failedTrackerIds } from '$domain/status';
	import {
		androidHealth as health,
		androidSyncCoordinator,
		androidUsage as usage,
		checkAndroidPermissions
	} from '$native/android-data';
	import { listenForResume } from '$native/app';
	import { openAndroidAppDetails } from '$native/android-settings';
	import { isNativeAndroid } from '$native/platform';

	let {
		showHelpLink = true,
		tracker: focusedTracker
	}: { showHelpLink?: boolean; tracker?: TrackerId } = $props();
	let status = $state<MobileSyncStatus>(createEmptyStatus());
	let healthAvailable = $state(false);
	let loaded = $state(false);
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);
	const visibleTrackers = $derived(focusedTracker ? [focusedTracker] : TRACKER_IDS);
	const usesHealthConnect = $derived(focusedTracker !== 'screenTime');
	const usesUsageAccess = $derived(!focusedTracker || focusedTracker === 'screenTime');
	const screenTimeNeedsAccess = $derived(
		usesUsageAccess && loaded && status.trackers.screenTime.permission !== 'granted'
	);

	onMount(() => {
		if (!isNativeAndroid()) return;
		void refresh();
		let removeResume = () => {};
		void listenForResume(refresh).then((remove) => (removeResume = remove));
		return () => removeResume();
	});

	async function refresh() {
		await run(async () => {
			await androidSyncCoordinator.syncStale();
			await refreshPermissions();
			const trackers = relevantFailedTrackers();
			failed = trackers.length > 0;
			message = failed ? syncFailureMessage(trackers) : '';
		}, 'Could not refresh Android data.');
	}

	async function refreshPermissions() {
		const result = await checkAndroidPermissions();
		healthAvailable = result.healthAvailable;
		status = await mobileRepository.loadStatus();
		status.trackers.steps.permission = result.permissions.steps;
		status.trackers.sleep.permission = result.permissions.sleep;
		status.trackers.screenTime.permission = result.permissions.screenTime;
		loaded = true;
	}

	async function grantHealth() {
		await run(async () => {
			await health.requestReadPermissions();
			await refreshPermissions();
		}, 'Health Connect permission could not be requested.');
	}

	async function openAppSettings() {
		await run(() => openAndroidAppDetails(), 'App settings could not be opened.');
	}

	async function openHealthSettings() {
		await run(() => health.openSettings(), 'Health Connect settings could not be opened.');
	}

	async function openUsageSettings() {
		await run(() => usage.openSettings(), 'Usage Access settings could not be opened.');
	}

	async function openPrivacyPolicy() {
		await run(() => health.showPrivacyPolicy(), 'The privacy policy could not be opened.');
	}

	async function syncNow() {
		await run(async () => {
			await synchronizeTrackers();
			status = await mobileRepository.loadStatus();
			const trackers = relevantFailedTrackers();
			failed = trackers.length > 0;
			message = failed ? syncFailureMessage(trackers) : 'Android synchronization completed.';
			await invalidateAll();
		}, 'Synchronization could not complete.');
	}

	function synchronizeTrackers() {
		return focusedTracker
			? androidSyncCoordinator.sync([focusedTracker])
			: androidSyncCoordinator.syncAll();
	}

	function relevantFailedTrackers() {
		const trackers = failedTrackerIds(status);
		return focusedTracker ? trackers.filter((tracker) => tracker === focusedTracker) : trackers;
	}

	async function run(action: () => Promise<void>, fallback: string) {
		if (busy) return;
		busy = true;
		message = '';
		failed = false;
		try {
			await action();
		} catch (cause) {
			failed = true;
			message = cause instanceof Error ? cause.message : fallback;
		} finally {
			busy = false;
		}
	}

	function label(tracker: (typeof TRACKER_IDS)[number]) {
		return tracker === 'screenTime' ? 'Screen time' : tracker[0].toUpperCase() + tracker.slice(1);
	}

	function lastSync(tracker: (typeof TRACKER_IDS)[number]) {
		const value = status.trackers[tracker].lastSuccessAt;
		return value ? new Date(value).toLocaleString() : 'No successful upload yet';
	}

	function failureMessage(tracker: (typeof TRACKER_IDS)[number]) {
		return status.trackers[tracker].outcome === 'failed'
			? status.trackers[tracker].failure?.message
			: undefined;
	}

	function syncFailureMessage(trackers: TrackerId[]) {
		const labels = trackers.map(label).join(', ');
		return `${labels} ${trackers.length === 1 ? 'is' : 'are'} not being processed.`;
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Smartphone class="size-5" />
			{focusedTracker ? `${label(focusedTracker)} Android data` : 'Android data'}
		</CardTitle>
	</CardHeader>
	<CardContent class="space-y-5">
		{#if !isNativeAndroid()}
			<p class="text-sm leading-6 text-(--text)/64">
				Health Connect and Usage Access are available in the Android app.
			</p>
		{:else}
			{#if screenTimeNeedsAccess}
				<Alert variant="destructive">
					<AlertTitle>Screen time is not being processed</AlertTitle>
					<AlertDescription>
						Android Usage Access is off. If Android calls it a restricted setting, open App
						settings, tap ⋮, choose Allow restricted settings, then return and open Usage access.
					</AlertDescription>
				</Alert>
			{/if}
			{#if message}
				<Alert variant={failed ? 'destructive' : 'default'}
					><AlertDescription>{message}</AlertDescription></Alert
				>
			{/if}
			<div class="divide-y divide-(--text)/8">
				{#each visibleTrackers as tracker (tracker)}
					<div class="flex items-start justify-between gap-4 py-3 first:pt-0">
						<div>
							<p class="text-sm font-medium">{label(tracker)}</p>
							<p class="text-xs text-(--text)/48">{lastSync(tracker)}</p>
							{#if failureMessage(tracker)}
								<p class="mt-1 text-xs leading-5 text-red-600 dark:text-red-400">
									{failureMessage(tracker)}
								</p>
							{/if}
						</div>
						<Badge>{status.trackers[tracker].permission}</Badge>
					</div>
				{/each}
			</div>
			<div class="flex flex-wrap gap-2">
				{#if usesHealthConnect}
					<Button
						type="button"
						variant="ghost"
						disabled={busy || !healthAvailable}
						onclick={grantHealth}
					>
						<Activity class="size-4" /> Health access
					</Button>
					<Button
						type="button"
						variant="ghost"
						disabled={busy || !healthAvailable}
						onclick={openHealthSettings}
					>
						<Settings class="size-4" /> Health Connect
					</Button>
					<Button type="button" variant="ghost" disabled={busy} onclick={openPrivacyPolicy}>
						<Shield class="size-4" /> Privacy
					</Button>
				{/if}
				{#if usesUsageAccess}
					{#if screenTimeNeedsAccess}
						<Button type="button" variant="ghost" disabled={busy} onclick={openAppSettings}>
							<Settings class="size-4" /> App settings
						</Button>
					{/if}
					<Button type="button" variant="ghost" disabled={busy} onclick={openUsageSettings}>
						<Smartphone class="size-4" /> Usage access
					</Button>
				{/if}
				{#if showHelpLink}
					<Button href="/android-data-help" variant="ghost" disabled={busy}>
						<CircleHelp class="size-4" /> Troubleshooting
					</Button>
				{/if}
				<Button type="button" disabled={busy} onclick={syncNow}>
					<RefreshCw class="size-4" data-motion-spin={busy || undefined} /> Sync now
				</Button>
			</div>
		{/if}
	</CardContent>
</Card>
