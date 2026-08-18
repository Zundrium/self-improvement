<script lang="ts">
	import { CircleCheck, CircleX, Clock3, Footprints, Moon } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { TrackerId, TrackerStatus as TrackerStatusModel } from '../domain/model';

	let {
		tracker,
		status,
		timeZone
	}: { tracker: TrackerId; status: TrackerStatusModel; timeZone: string } = $props();

	const labels: Record<TrackerId, string> = {
		steps: 'Steps',
		sleep: 'Sleep',
		screenTime: 'Screen time'
	};

	function permissionLabel() {
		if (status.permission === 'granted') return 'Permission granted';
		if (status.permission === 'denied') return 'Permission needed';
		if (status.permission === 'unavailable') return 'Unavailable';
		return 'Not checked';
	}

	function lastSuccessLabel() {
		if (!status.lastSuccessAt) return 'Never synced';
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone
		}).format(new Date(status.lastSuccessAt));
	}
</script>

<Card class="gap-4 p-4">
	<CardHeader class="flex-row items-start justify-between gap-3">
		<div class="flex items-center gap-3">
			<div class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-(--text)/6">
				{#if tracker === 'steps'}
					<Footprints class="size-5" aria-hidden="true" />
				{:else if tracker === 'sleep'}
					<Moon class="size-5" aria-hidden="true" />
				{:else}
					<Clock3 class="size-5" aria-hidden="true" />
				{/if}
			</div>
			<div>
				<CardTitle>{labels[tracker]}</CardTitle>
				<p class="mt-0.5 text-xs text-(--text)/48">{permissionLabel()}</p>
			</div>
		</div>
		{#if status.outcome === 'success'}
			<Badge class="text-emerald-700 dark:text-emerald-400">
				<CircleCheck class="size-3.5" aria-hidden="true" /> Synced
			</Badge>
		{:else if status.outcome === 'failed'}
			<Badge class="text-red-600 dark:text-red-400">
				<CircleX class="size-3.5" aria-hidden="true" /> Needs attention
			</Badge>
		{:else}
			<Badge>Waiting</Badge>
		{/if}
	</CardHeader>
	<CardContent class="gap-2">
		<div class="flex items-center justify-between gap-3 text-sm">
			<span class="text-(--text)/48">Last successful sync</span>
			<span class="text-right font-medium">{lastSuccessLabel()}</span>
		</div>
		{#if status.failure}
			<div
				class="rounded-2xl bg-red-500/8 px-3 py-2.5 text-sm text-red-700 dark:text-red-300"
				role="alert"
			>
				<p class="font-medium capitalize">{status.failure.category} failure</p>
				<p class="mt-0.5 text-xs leading-relaxed opacity-80">{status.failure.message}</p>
			</div>
		{/if}
	</CardContent>
</Card>
