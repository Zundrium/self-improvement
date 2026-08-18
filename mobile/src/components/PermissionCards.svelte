<script lang="ts">
	import { Activity, ExternalLink, Settings, ShieldCheck, Smartphone } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { PermissionState } from '../domain/model';
	import MobileButton from './MobileButton.svelte';

	let {
		healthAvailable,
		healthAvailabilityReason,
		stepsPermission,
		sleepPermission,
		usagePermission,
		busy,
		onRequestHealth,
		onHealthSettings,
		onPrivacyPolicy,
		onUsageSettings
	}: {
		healthAvailable: boolean | null;
		healthAvailabilityReason: string;
		stepsPermission: PermissionState;
		sleepPermission: PermissionState;
		usagePermission: PermissionState;
		busy: boolean;
		onRequestHealth: () => void;
		onHealthSettings: () => void;
		onPrivacyPolicy: () => void;
		onUsageSettings: () => void;
	} = $props();

	function permissionLabel(permission: PermissionState) {
		if (permission === 'granted') return 'Allowed';
		if (permission === 'denied') return 'Permission needed';
		if (permission === 'unavailable') return 'Unavailable';
		return 'Not checked';
	}
</script>

<div class="grid gap-4 md:grid-cols-2">
	<Card>
		<CardHeader>
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<div class="flex size-10 items-center justify-center rounded-2xl bg-(--text)/6">
						<Activity class="size-5" aria-hidden="true" />
					</div>
					<div>
						<CardTitle>Health Connect</CardTitle>
						<CardDescription>Read-only health access</CardDescription>
					</div>
				</div>
				<Badge class={healthAvailable ? 'text-emerald-700 dark:text-emerald-400' : undefined}>
					{healthAvailable === null ? 'Checking' : healthAvailable ? 'Available' : 'Unavailable'}
				</Badge>
			</div>
		</CardHeader>
		<CardContent>
			<p class="text-sm leading-relaxed text-(--text)/64">
				Self Improvement reads daily step aggregates and sleep sessions with stage detail for the
				latest seven local days. It never writes health data and does not request unrelated health
				permissions.
			</p>
			{#if healthAvailable === false}
				<p
					class="rounded-2xl bg-amber-500/8 p-3 text-sm text-amber-800 dark:text-amber-300"
					role="status"
				>
					{healthAvailabilityReason || 'Health Connect is unavailable on this device.'}
				</p>
			{/if}
			<div class="grid gap-2 rounded-2xl bg-(--text)/4 p-3 text-sm">
				<div class="flex items-center justify-between">
					<span>Steps</span><span class="text-(--text)/56">{permissionLabel(stepsPermission)}</span>
				</div>
				<div class="flex items-center justify-between">
					<span>Sleep and stages</span><span class="text-(--text)/56"
						>{permissionLabel(sleepPermission)}</span
					>
				</div>
			</div>
		</CardContent>
		<CardFooter class="flex-wrap">
			<MobileButton
				size="sm"
				disabled={busy || healthAvailable === false}
				onclick={onRequestHealth}
			>
				<ShieldCheck aria-hidden="true" /> Allow read access
			</MobileButton>
			<MobileButton size="sm" variant="ghost" disabled={busy} onclick={onHealthSettings}>
				<Settings aria-hidden="true" /> Settings
			</MobileButton>
			<MobileButton size="sm" variant="ghost" disabled={busy} onclick={onPrivacyPolicy}>
				<ExternalLink aria-hidden="true" /> Privacy
			</MobileButton>
		</CardFooter>
	</Card>

	<Card>
		<CardHeader>
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-2xl bg-(--text)/6">
					<Smartphone class="size-5" aria-hidden="true" />
				</div>
				<div>
					<CardTitle>Usage Access</CardTitle>
					<CardDescription>Daily foreground app usage</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<p class="text-sm leading-relaxed text-(--text)/64">
				Android requires Usage Access to calculate screen time. Only foreground duration and
				last-use time are read. Package names are used as labels; the companion never requests the
				complete installed-app list.
			</p>
			<div class="flex items-center justify-between rounded-2xl bg-(--text)/4 p-3 text-sm">
				<span>Screen time</span>
				<span class="text-(--text)/56">{permissionLabel(usagePermission)}</span>
			</div>
		</CardContent>
		<CardFooter>
			<MobileButton size="sm" disabled={busy} onclick={onUsageSettings}>
				<Settings aria-hidden="true" /> Open Usage Access
			</MobileButton>
		</CardFooter>
	</Card>
</div>
