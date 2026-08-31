<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { Activity, Check, RefreshCw, Settings, Smartphone } from '@lucide/svelte';
	import { recordAchievementEvents } from '$lib/api';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Spinner } from '$lib/components/ui/spinner';
	import { spin } from '$lib/motion/gsap';
	import { TRACKER_IDS, type PermissionState, type TrackerId } from '$domain/model';
	import {
		androidHealth,
		androidSyncCoordinator,
		androidUsage,
		checkAndroidPermissions
	} from '$native/android-data';
	import { listenForResume } from '$native/app';
	import { androidSetupRepository } from '$native/android-setup';
	import { openAndroidAppDetails } from '$native/android-settings';

	let permissions = $state<Record<TrackerId, PermissionState>>({
		steps: 'unknown',
		sleep: 'unknown',
		screenTime: 'unknown'
	});
	let healthAvailable = $state(false);
	let busy = $state('');
	let message = $state('');
	const allGranted = $derived(TRACKER_IDS.every((tracker) => permissions[tracker] === 'granted'));

	onMount(() => {
		void refreshAccess();
		let removeResume = () => {};
		void listenForResume(refreshAccess).then((remove) => (removeResume = remove));
		return () => removeResume();
	});

	async function refreshAccess() {
		await run('check', loadAccess, 'Android access could not be checked.');
	}

	async function loadAccess() {
		const result = await checkAndroidPermissions();
		healthAvailable = result.healthAvailable;
		permissions = result.permissions;
	}

	async function openAppSettings() {
		await run('settings', openAndroidAppDetails, 'App settings could not be opened.');
	}

	async function grantHealthAccess() {
		await run(
			'health',
			async () => {
				await androidHealth.requestReadPermissions();
				await loadAccess();
			},
			'Health access could not be requested.'
		);
	}

	async function openUsageAccess() {
		await run('usage', () => androidUsage.openSettings(), 'Usage Access could not be opened.');
	}

	async function continueToApp() {
		await run(
			'continue',
			async () => {
				await androidSyncCoordinator.syncAll();
				await androidSetupRepository.complete();
				await recordAchievementEvents('setup-android-complete');
				await goto(resolve('/'));
			},
			'Android setup could not be completed.'
		);
	}

	async function run(name: string, action: () => Promise<void>, fallback: string) {
		if (busy) return;
		busy = name;
		message = '';
		try {
			await action();
		} catch (cause) {
			message = cause instanceof Error ? cause.message : fallback;
		} finally {
			busy = '';
		}
	}

	function trackerLabel(tracker: TrackerId) {
		return tracker === 'screenTime' ? 'Screen time' : tracker[0].toUpperCase() + tracker.slice(1);
	}

	function trackerDescription(tracker: TrackerId) {
		if (tracker === 'steps') return 'Daily step totals from Health Connect';
		if (tracker === 'sleep') return 'Bedtime activity from Android Usage Access';
		return 'App usage from Android Usage Access';
	}

	function permissionLabel(permission: PermissionState) {
		if (permission === 'granted') return 'Granted';
		if (permission === 'unavailable') return 'Unavailable';
		if (permission === 'denied') return 'Not granted';
		return 'Checking';
	}

	function permissionClass(permission: PermissionState) {
		return permission === 'granted'
			? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
			: 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
	}
</script>

<svelte:head><title>Connect Android data · Self Improvement</title></svelte:head>

<main class="app-gutter min-h-svh overflow-y-auto py-8 sm:py-12">
	<div class="mx-auto w-full max-w-2xl space-y-6">
		<header class="max-w-xl">
			<span
				class="mb-5 flex size-12 items-center justify-center rounded-3xl bg-(--text) text-(--bg)"
			>
				<Smartphone class="size-6" />
			</span>
			<h1 class="text-3xl font-medium tracking-[-0.05em]">Connect Android data</h1>
			<p class="mt-2 leading-6 text-(--text)/56">
				Allow Health Connect for steps and Usage Access for bedtime and screen time.
			</p>
		</header>

		{#if message}
			<Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
		{/if}

		<Card>
			<CardHeader>
				<div class="flex items-start gap-3">
					<Badge class="bg-(--text) text-(--bg)">1</Badge>
					<div>
						<CardTitle>Allow restricted settings</CardTitle>
						<CardDescription>
							Required when Self Improvement was installed outside Google Play.
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm leading-6 text-(--text)/64">
					Open App settings, tap ⋮ in the top-right corner, then choose Allow restricted settings.
				</p>
				<Button size="medium" type="button" variant="ghost" disabled={Boolean(busy)} onclick={openAppSettings}>
					{#if busy === 'settings'}<Spinner class="size-4" />{:else}<Settings class="size-4" />{/if}
					Open App settings
				</Button>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<div class="flex items-start gap-3">
					<Badge class="bg-(--text) text-(--bg)">2</Badge>
					<div>
						<CardTitle>Check Android access</CardTitle>
						<CardDescription>Status refreshes automatically when you return.</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent class="space-y-5">
				<div class="divide-y divide-(--text)/8">
					{#each TRACKER_IDS as tracker (tracker)}
						<div class="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
							<div class="min-w-0">
								<p class="text-sm font-medium">{trackerLabel(tracker)}</p>
								<p class="text-xs leading-5 text-(--text)/48">{trackerDescription(tracker)}</p>
							</div>
							<Badge class={permissionClass(permissions[tracker])}>
								{#if permissions[tracker] === 'granted'}<Check class="size-3.5" />{/if}
								{permissionLabel(permissions[tracker])}
							</Badge>
						</div>
					{/each}
				</div>

				<div class="flex flex-wrap gap-2">
					<Button size="medium"
						type="button"
						variant="ghost"
						disabled={Boolean(busy) || !healthAvailable}
						onclick={grantHealthAccess}
					>
						{#if busy === 'health'}<Spinner class="size-4" />{:else}<Activity class="size-4" />{/if}
						Health access
					</Button>
					<Button size="medium" type="button" variant="ghost" disabled={Boolean(busy)} onclick={openUsageAccess}>
						<Smartphone class="size-4" /> Usage access
					</Button>
					<Button size="medium" type="button" variant="ghost" disabled={Boolean(busy)} onclick={refreshAccess}>
						<span class="inline-flex" use:spin={busy === 'check'}><RefreshCw class="size-4" /></span>
						Check again
					</Button>
				</div>

				<Alert variant={allGranted ? 'default' : 'destructive'}>
					<AlertTitle>{allGranted ? 'All access granted' : 'Access is incomplete'}</AlertTitle>
					<AlertDescription>
						{allGranted
							? 'Your Android trackers are ready to process data.'
							: 'Grant the remaining access, or continue without it. Missing trackers will not process data.'}
					</AlertDescription>
				</Alert>
			</CardContent>
			<CardFooter>
				<Button size="medium"
					class="w-full"
					type="button"
					variant={allGranted ? 'default' : 'ghost'}
					disabled={Boolean(busy)}
					onclick={continueToApp}
				>
					{#if busy === 'continue'}<Spinner class="size-4" />{/if}
					{allGranted ? 'Continue' : 'Continue without full access'}
				</Button>
			</CardFooter>
		</Card>
	</div>
</main>
