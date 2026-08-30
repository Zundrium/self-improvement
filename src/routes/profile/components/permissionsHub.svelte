<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import {
		Check,
		CircleAlert,
		Footprints,
		LoaderCircle,
		Moon,
		RefreshCw,
		Settings,
		ShieldCheck,
		Smartphone
	} from '@lucide/svelte';
	import { mobileRepository } from '$lib/api';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
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

	type Instruction = { title: string; description: string };
	type Props = { tracker?: TrackerId };

	let { tracker: focusedTracker }: Props = $props();
	const nativeAndroid = isNativeAndroid();
	let status = $state<MobileSyncStatus>(createEmptyStatus());
	let healthAvailable = $state(false);
	let loaded = $state(!nativeAndroid);
	let busy = $state(false);
	let message = $state('');
	let failed = $state(false);
	let openTracker = $state(untrack(() => focusedTracker ?? ''));
	const visibleTrackers = TRACKER_IDS;

	const instructions: Record<TrackerId, Instruction[]> = {
		steps: [
			{
				title: 'Connect a step source',
				description:
					'Make sure your phone, watch, or fitness app records steps and is allowed to write them to Health Connect.'
			},
			{
				title: 'Allow step access',
				description:
					'Tap Health access below and allow Self Improvement to read Steps from Health Connect.'
			},
			{
				title: 'Check the connection',
				description:
					'Open Health Connect → Data and access → Activity → Steps to confirm that recent entries are available.'
			}
		],
		sleep: [
			{
				title: 'Allow Android activity access',
				description: 'Open Usage access, select Self Improvement, and enable Permit usage access.'
			},
			{
				title: 'Choose the apps that count',
				description:
					'Sleep uses your tracked-app list to check foreground activity during the four hours after bedtime.'
			},
			{
				title: 'Set your bedtime',
				description:
					'Choose the cutoff from which Self Improvement should start checking for late app activity.'
			}
		],
		screenTime: [
			{
				title: 'Allow restricted settings if needed',
				description:
					'For a sideloaded app, open App settings, tap ⋮, and choose Allow restricted settings.'
			},
			{
				title: 'Allow Usage Access',
				description: 'Open Usage access, select Self Improvement, and enable Permit usage access.'
			},
			{
				title: 'Generate recent activity',
				description:
					'Use another app for at least a minute so Android has recent foreground activity to share.'
			}
		]
	};

	onMount(() => {
		if (!nativeAndroid) return;
		void refresh();
		let removeResume = () => {};
		void listenForResume(refresh).then((remove) => (removeResume = remove));
		return () => removeResume();
	});

	async function refresh() {
		await run(async () => {
			await androidSyncCoordinator.syncStale();
			await refreshStatus();
			setFailureMessage();
		}, 'Could not refresh data access.');
	}

	async function refreshStatus() {
		const result = await checkAndroidPermissions();
		healthAvailable = result.healthAvailable;
		status = await mobileRepository.loadStatus();
		status.trackers.steps.permission = result.permissions.steps;
		status.trackers.sleep.permission = result.permissions.sleep;
		status.trackers.screenTime.permission = result.permissions.screenTime;
		loaded = true;
	}

	async function syncNow() {
		await run(async () => {
			await synchronizeTrackers();
			await refreshStatus();
			setFailureMessage('Data access checked and synchronization completed.');
			await invalidateAll();
		}, 'Synchronization could not complete.');
	}

	async function grantHealth() {
		await run(async () => {
			await health.requestReadPermissions();
			await androidSyncCoordinator.sync(['steps']);
			await refreshStatus();
			setFailureMessage();
			await invalidateAll();
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

	function synchronizeTrackers() {
		return androidSyncCoordinator.syncAll();
	}

	function relevantFailedTrackers() {
		return failedTrackerIds(status);
	}

	function setFailureMessage(successMessage = '') {
		const trackers = relevantFailedTrackers();
		failed = trackers.length > 0;
		message = failed ? `${trackers.map(label).join(', ')} needs attention.` : successMessage;
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

	function label(tracker: TrackerId) {
		return tracker === 'screenTime' ? 'Screen time' : tracker[0].toUpperCase() + tracker.slice(1);
	}

	function provider(tracker: TrackerId) {
		return tracker === 'steps' ? 'Health Connect' : 'Android Usage Access';
	}

	function isWorking(tracker: TrackerId) {
		const trackerStatus = status.trackers[tracker];
		return (
			nativeAndroid &&
			loaded &&
			trackerStatus.permission === 'granted' &&
			trackerStatus.outcome === 'success'
		);
	}

	function statusLabel(tracker: TrackerId) {
		if (!nativeAndroid) return 'Android app only';
		if (!loaded) return 'Checking…';
		const trackerStatus = status.trackers[tracker];
		if (trackerStatus.permission === 'unavailable') return 'Unavailable';
		if (trackerStatus.permission !== 'granted') return 'Permission needed';
		if (trackerStatus.outcome === 'failed') return 'Sync issue';
		if (trackerStatus.outcome === 'success') return 'Working correctly';
		return 'Ready to sync';
	}

	function lastSync(tracker: TrackerId) {
		const value = status.trackers[tracker].lastSuccessAt;
		return value
			? `Last successful sync: ${new Date(value).toLocaleString()}`
			: 'No successful sync yet';
	}

	function trackerIcon(tracker: TrackerId) {
		if (tracker === 'steps') return Footprints;
		if (tracker === 'sleep') return Moon;
		return Smartphone;
	}
</script>

<section class="space-y-6">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="space-y-1.5">
			<h2 class="flex items-center gap-2 text-lg font-medium tracking-[-0.03em]">
				<ShieldCheck class="size-5" /> How to let this app access your data
			</h2>
			<p class="text-sm leading-6 text-(--text)/56">
				Check each connection and fix only the ones that need attention.
			</p>
		</div>
		<Button size="medium" type="button" class="w-full sm:w-auto" disabled={busy || !nativeAndroid} onclick={syncNow}>
			{#if busy}
				<LoaderCircle class="size-4" data-motion-spin />
			{:else}
				<RefreshCw class="size-4" />
			{/if}
			Sync now
		</Button>
	</header>

	<div class="space-y-4">
		{#if message}
			<Alert variant={failed ? 'destructive' : 'default'}>
				<AlertDescription>{message}</AlertDescription>
			</Alert>
		{/if}

		<Accordion type="single" bind:value={openTracker} class="rounded-3xl bg-(--text)/3 px-4">
			{#each visibleTrackers as tracker (tracker)}
				{@const TrackerIcon = trackerIcon(tracker)}
				<AccordionItem value={tracker} class="last:border-0">
					{#if isWorking(tracker)}
						<div class="flex items-center gap-3 py-5">
							<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--text)/6">
								<TrackerIcon class="size-5" />
							</span>
							<span class="min-w-0 flex-1">
								<strong class="block text-sm font-medium">{label(tracker)}</strong>
								<span class="block text-xs text-(--text)/48">{provider(tracker)}</span>
							</span>
							<span class="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
								<Check class="size-5" strokeWidth={2.5} />
								<span class="hidden sm:inline">Working correctly</span>
							</span>
						</div>
					{:else}
						<AccordionTrigger class="py-5">
							<span class="flex min-w-0 flex-1 items-center gap-3">
								<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--text)/6">
									<TrackerIcon class="size-5" />
								</span>
								<span class="min-w-0 flex-1">
									<strong class="block font-medium">{label(tracker)}</strong>
									<span class="block text-xs font-normal text-(--text)/48">{provider(tracker)}</span>
								</span>
								<Badge class="shrink-0">{statusLabel(tracker)}</Badge>
							</span>
						</AccordionTrigger>
						<AccordionContent class="space-y-5 sm:pl-13">
							{#if status.trackers[tracker].failure?.message}
								<div class="flex gap-2 text-red-600 dark:text-red-400">
									<CircleAlert class="mt-0.5 size-4 shrink-0" />
									<p>{status.trackers[tracker].failure?.message}</p>
								</div>
							{/if}

							<ol class="space-y-4">
								{#each instructions[tracker] as instruction, index (instruction.title)}
									<li class="flex gap-3">
										<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--text)/7 text-xs font-medium">
											{index + 1}
										</span>
										<div>
											<h3 class="font-medium text-(--text)">{instruction.title}</h3>
											<p class="mt-0.5 text-(--text)/60">{instruction.description}</p>
										</div>
									</li>
								{/each}
							</ol>

							<p class="text-xs text-(--text)/48">{lastSync(tracker)}</p>

							<div class="flex flex-wrap gap-2">
								{#if tracker === 'steps'}
									<Button size="medium" type="button" disabled={busy || !nativeAndroid || !healthAvailable} onclick={grantHealth}>
										<ShieldCheck class="size-4" /> Health access
									</Button>
									<Button size="medium" type="button" variant="ghost" disabled={busy || !nativeAndroid || !healthAvailable} onclick={openHealthSettings}>
										<Settings class="size-4" /> Health Connect
									</Button>
								{:else}
									<Button size="medium" type="button" disabled={busy || !nativeAndroid} onclick={openUsageSettings}>
										<Smartphone class="size-4" /> Usage access
									</Button>
									<Button size="medium" type="button" variant="ghost" disabled={busy || !nativeAndroid} onclick={openAppSettings}>
										<Settings class="size-4" /> App settings
									</Button>
									{#if tracker === 'sleep'}
										<Button size="medium" href="/screen-time/settings" variant="ghost">Tracked apps</Button>
										<Button size="medium" href="/sleep/settings" variant="ghost">Bedtime</Button>
									{/if}
								{/if}
							</div>
						</AccordionContent>
					{/if}
				</AccordionItem>
			{/each}
		</Accordion>
	</div>
</section>
