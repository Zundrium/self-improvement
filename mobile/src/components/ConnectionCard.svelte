<script lang="ts">
	import { QrCode, ShieldCheck, Unplug } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { PairingCredentials } from '../domain/model';
	import MobileButton from './MobileButton.svelte';

	let {
		pairing,
		busy,
		onPair,
		onDisconnect
	}: {
		pairing: PairingCredentials | null;
		busy: boolean;
		onPair: () => void;
		onDisconnect: () => void;
	} = $props();

	function serverLabel() {
		if (!pairing) return '';
		return new URL(pairing.apiBaseUrl).host;
	}
</script>

<Card>
	<CardHeader>
		<div class="flex items-start justify-between gap-3">
			<div>
				<CardTitle>Connection</CardTitle>
				<CardDescription class="mt-1">
					Scan once to connect all three trackers without signing in on this device.
				</CardDescription>
			</div>
			<Badge class={pairing ? 'text-emerald-700 dark:text-emerald-400' : undefined}>
				{pairing ? 'Connected' : 'Not connected'}
			</Badge>
		</div>
	</CardHeader>
	<CardContent>
		{#if pairing}
			<div class="grid gap-3 rounded-2xl bg-(--text)/4 p-4 text-sm">
				<div class="flex items-center justify-between gap-4">
					<span class="text-(--text)/48">Server</span>
					<span class="max-w-[65%] truncate text-right font-medium">{serverLabel()}</span>
				</div>
				<div class="flex items-center justify-between gap-4">
					<span class="text-(--text)/48">Time zone</span>
					<span class="text-right font-medium">{pairing.timeZone}</span>
				</div>
				<div class="flex items-center gap-2 text-xs text-(--text)/56">
					<ShieldCheck class="size-4" aria-hidden="true" />
					Credentials are held in Android Keystore-backed secure storage.
				</div>
			</div>
		{:else}
			<p class="text-sm leading-relaxed text-(--text)/64">
				Open your profile on the Self Improvement website, choose Connect Android companion, and
				scan the displayed code.
			</p>
		{/if}
	</CardContent>
	<CardFooter>
		{#if pairing}
			<MobileButton variant="destructive" class="w-full" disabled={busy} onclick={onDisconnect}>
				<Unplug aria-hidden="true" /> Disconnect
			</MobileButton>
		{:else}
			<MobileButton class="w-full" disabled={busy} onclick={onPair}>
				<QrCode aria-hidden="true" />
				{busy ? 'Opening scanner…' : 'Scan pairing QR'}
			</MobileButton>
		{/if}
	</CardFooter>
</Card>
