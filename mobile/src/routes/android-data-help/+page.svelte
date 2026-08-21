<script lang="ts">
	import { Activity, Database, RefreshCw } from '@lucide/svelte';
	import NativeSyncCard from '$lib/components/nativeSyncCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function statusLabel(tracker: (typeof data.trackers)[number]) {
		if (tracker.hasData) return 'Data received';
		return tracker.isSynced ? 'No measured data' : 'Not synced';
	}

	function statusClass(tracker: (typeof data.trackers)[number]) {
		return tracker.hasData
			? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
			: 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
	}

	function lastReceived(value: string | null) {
		return value ? new Date(value).toLocaleString() : 'No upload received yet';
	}
</script>

<svelte:head>
	<title>Android data help · Self Improvement</title>
	<meta
		name="description"
		content="Check Health Connect and Android Usage Access tracker connections."
	/>
</svelte:head>

<main class="app-gutter mx-auto w-full max-w-3xl flex-1 space-y-6 py-6 pb-10 sm:py-10">
	<header class="max-w-2xl">
		<h1 class="text-3xl font-medium tracking-[-0.05em]">Android data help</h1>
		<p class="mt-2 leading-6 text-(--text)/56">
			Use these checks when Steps, Sleep, or Screen time remains at zero or has not synced.
		</p>
	</header>

	<section class="grid gap-3 sm:grid-cols-3" aria-label="Android tracker status">
		{#each data.trackers as tracker (tracker.id)}
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between gap-3">
						<div>
							<CardTitle>{tracker.label}</CardTitle>
							<CardDescription>{tracker.provider}</CardDescription>
						</div>
						<Badge class={statusClass(tracker)}>{statusLabel(tracker)}</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<p class="text-xs leading-5 text-(--text)/48">{lastReceived(tracker.lastReceivedAt)}</p>
				</CardContent>
			</Card>
		{/each}
	</section>

	<Card>
		<CardHeader>
			<CardTitle>Check the connection in three steps</CardTitle>
			<CardDescription>Complete every step, then review the tracker status again.</CardDescription>
		</CardHeader>
		<CardContent>
			<ol class="divide-y divide-(--text)/8">
				<li class="flex gap-4 py-5 first:pt-0">
					<span
						class="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--text)/8 text-sm font-medium"
						>1</span
					>
					<div>
						<h2 class="flex items-center gap-2 font-medium">
							<Activity class="size-4" /> Allow Android access
						</h2>
						<p class="mt-1 text-sm leading-6 text-(--text)/64">
							Steps and Sleep need read access in Health Connect. Screen time uses Android Usage
							Access. For a sideloaded app, allow restricted settings in App settings first.
						</p>
					</div>
				</li>
				<li class="flex gap-4 py-5">
					<span
						class="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--text)/8 text-sm font-medium"
						>2</span
					>
					<div>
						<h2 class="flex items-center gap-2 font-medium">
							<Database class="size-4" /> Check the source data
						</h2>
						<p class="mt-1 text-sm leading-6 text-(--text)/64">
							Health Connect does not measure anything itself. Open Health Connect → Data and access
							and verify that another app has written recent Steps or Sleep entries. For Screen
							time, verify Usage Access and use the device before trying again.
						</p>
					</div>
				</li>
				<li class="flex gap-4 py-5 last:pb-0">
					<span
						class="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--text)/8 text-sm font-medium"
						>3</span
					>
					<div>
						<h2 class="flex items-center gap-2 font-medium">
							<RefreshCw class="size-4" /> Synchronize again
						</h2>
						<p class="mt-1 text-sm leading-6 text-(--text)/64">
							Return to Self Improvement and tap Sync now below. A completed upload without
							measurements means the Android provider had no usable recent data. A failed tracker
							shows the remaining permission, provider, or upload problem.
						</p>
					</div>
				</li>
			</ol>
		</CardContent>
	</Card>

	<NativeSyncCard showHelpLink={false} />
</main>
