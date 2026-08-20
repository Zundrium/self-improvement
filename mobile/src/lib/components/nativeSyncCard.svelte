<script lang="ts">
	import { onMount } from 'svelte';
	import { Activity, RefreshCw, Settings, Shield, Smartphone } from '@lucide/svelte';
	import { mobileRepository } from '$lib/api';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { TRACKER_IDS, type MobileSyncStatus } from '$domain/model';
	import { createEmptyStatus } from '$domain/status';
	import { SyncCoordinator } from '$domain/sync-coordinator';
	import { listenForResume } from '$native/app';
	import { AndroidHealthAdapter } from '$native/health';
	import { createNativeTrackerJobs } from '$native/jobs';
	import { isNativeAndroid } from '$native/platform';
	import { AndroidUsageAdapter } from '$native/usage';

	const health = new AndroidHealthAdapter();
	const usage = new AndroidUsageAdapter();
	const coordinator = new SyncCoordinator(mobileRepository, createNativeTrackerJobs(health, usage));
	let status = $state<MobileSyncStatus>(createEmptyStatus());
	let healthAvailable = $state(false);
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);

	onMount(() => {
		if (!isNativeAndroid()) return;
		void refresh();
		let removeResume = () => {};
		void listenForResume(refresh).then((remove) => (removeResume = remove));
		return () => removeResume();
	});

	async function refresh() {
		await run(refreshPermissions, 'Could not read Android permissions.');
	}

	async function refreshPermissions() {
		const availability = await health.isAvailable();
		healthAvailable = availability.available;
		const unavailable = Promise.resolve({ state: 'unavailable' as const });
		const [steps, sleep, screenTime] = await Promise.all([
			availability.available ? health.checkPermission('steps') : unavailable,
			availability.available ? health.checkPermission('sleep') : unavailable,
			usage.checkPermission()
		]);
		status = await mobileRepository.loadStatus();
		status.trackers.steps.permission = steps.state;
		status.trackers.sleep.permission = sleep.state;
		status.trackers.screenTime.permission = screenTime.state;
		await mobileRepository.saveStatus(status);
	}

	async function grantHealth() {
		await run(async () => {
			await health.requestReadPermissions();
			await refreshPermissions();
		}, 'Health Connect permission could not be requested.');
	}

	async function openUsageSettings() {
		await run(() => usage.openSettings(), 'Usage Access settings could not be opened.');
	}

	async function openPrivacyPolicy() {
		await run(() => health.showPrivacyPolicy(), 'The privacy policy could not be opened.');
	}

	async function syncNow() {
		await run(async () => {
			const report = await coordinator.syncAll();
			status = await mobileRepository.loadStatus();
			failed = report.overall === 'failed' || report.overall === 'partial';
			message =
				report.overall === 'success'
					? 'Health and screen time are up to date.'
					: 'Some trackers need attention.';
		}, 'Synchronization could not complete.');
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
		return value ? new Date(value).toLocaleString() : 'Not synced yet';
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2"><Smartphone class="size-5" /> Android data</CardTitle
		>
	</CardHeader>
	<CardContent class="space-y-5">
		{#if !isNativeAndroid()}
			<p class="text-sm leading-6 text-(--text)/64">
				Health Connect and Usage Access are available in the Android app.
			</p>
		{:else}
			{#if message}
				<Alert variant={failed ? 'destructive' : 'default'}
					><AlertDescription>{message}</AlertDescription></Alert
				>
			{/if}
			<div class="divide-y divide-(--text)/8">
				{#each TRACKER_IDS as tracker (tracker)}
					<div class="flex items-center justify-between gap-4 py-3 first:pt-0">
						<div>
							<p class="text-sm font-medium">{label(tracker)}</p>
							<p class="text-xs text-(--text)/48">{lastSync(tracker)}</p>
						</div>
						<Badge>{status.trackers[tracker].permission}</Badge>
					</div>
				{/each}
			</div>
			<div class="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="ghost"
					disabled={busy || !healthAvailable}
					onclick={grantHealth}
				>
					<Activity class="size-4" /> Health access
				</Button>
				<Button type="button" variant="ghost" disabled={busy} onclick={openUsageSettings}>
					<Settings class="size-4" /> Usage access
				</Button>
				<Button type="button" variant="ghost" disabled={busy} onclick={openPrivacyPolicy}>
					<Shield class="size-4" /> Privacy
				</Button>
				<Button type="button" disabled={busy} onclick={syncNow}>
					<RefreshCw class={busy ? 'size-4 animate-spin' : 'size-4'} /> Sync now
				</Button>
			</div>
		{/if}
	</CardContent>
</Card>
