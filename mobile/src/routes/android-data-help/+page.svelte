<script lang="ts">
	import { ArrowRight, Footprints, Moon, Smartphone } from '@lucide/svelte';
	import NativeSyncCard from '$lib/components/nativeSyncCard.svelte';
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
	import DataFlow from './components/dataFlow.svelte';
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
	<meta name="description" content="Set up Android tracker data access." />
</svelte:head>

<main class="app-gutter mx-auto w-full max-w-3xl flex-1 space-y-6 py-6 pb-10 sm:py-10">
	<header class="max-w-2xl">
		<h1 class="text-3xl font-medium tracking-[-0.05em]">Android data help</h1>
		<p class="mt-2 leading-6 text-(--text)/56">
			Find what measures each tracker, connect its data, and verify every step before synchronizing.
		</p>
	</header>

	<section class="grid gap-3 sm:grid-cols-3" aria-label="Android tracker status">
		{#each data.trackers as tracker (tracker.id)}
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between gap-3">
						<span class="flex size-9 items-center justify-center rounded-full bg-(--text)/6">
							{#if tracker.id === 'steps'}
								<Footprints class="size-4" />
							{:else if tracker.id === 'sleep'}
								<Moon class="size-4" />
							{:else}
								<Smartphone class="size-4" />
							{/if}
						</span>
						<Badge class={statusClass(tracker)}>{statusLabel(tracker)}</Badge>
					</div>
					<CardTitle>{tracker.label}</CardTitle>
					<CardDescription>{tracker.provider}</CardDescription>
				</CardHeader>
				<CardContent class="mt-auto">
					<p class="text-xs leading-5 text-(--text)/48">{lastReceived(tracker.lastReceivedAt)}</p>
				</CardContent>
				<CardFooter>
					<Button
						class="w-full"
						href={`/android-data-help/${tracker.id}`}
						size="sm"
						variant="ghost"
					>
						Open guide <ArrowRight class="size-4" />
					</Button>
				</CardFooter>
			</Card>
		{/each}
	</section>

	<Card>
		<CardHeader>
			<CardTitle>Know the source before checking the connection</CardTitle>
			<CardDescription>Steps and app activity come from two Android systems.</CardDescription>
		</CardHeader>
		<CardContent class="divide-y divide-(--text)/8">
			<div class="space-y-3 pb-5">
				<h2 class="font-medium">Steps</h2>
				<p class="text-sm leading-6 text-(--text)/64">
					Health Connect stores step measurements created by a phone, wearable, or health app.
				</p>
				<DataFlow
					items={['Measuring device', 'Health app', 'Health Connect', 'Self Improvement']}
				/>
			</div>
			<div class="space-y-3 pt-5">
				<h2 class="font-medium">Sleep and screen time</h2>
				<p class="text-sm leading-6 text-(--text)/64">
					Self Improvement reads Android app activity directly. Sleep evaluates selected apps in the
					four hours after bedtime.
				</p>
				<DataFlow items={['Android app activity', 'Usage Access', 'Self Improvement']} />
			</div>
		</CardContent>
	</Card>

	<NativeSyncCard showHelpLink={false} />
</main>
