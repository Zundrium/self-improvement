<script lang="ts">
	import { resolve } from '$app/paths';
	import { ChevronRight, LoaderCircle, RefreshCw, Shield } from '@lucide/svelte';
	import type { ActionFeedItem } from '$lib/api-types';
	import { trackerIcons } from '$lib/trackers/icons';
	import { getTrackerColors } from '$lib/trackers/registry';

	type Props = {
		item: ActionFeedItem;
		busy?: boolean;
		onexecute: (item: ActionFeedItem) => void;
	};

	let { item, busy = false, onexecute }: Props = $props();
	const trackerId = $derived(item.trackerIds[0]);
	const TrackerIcon = $derived(trackerId ? trackerIcons[trackerId] : undefined);
	const trackerColors = $derived(trackerId ? getTrackerColors(trackerId) : undefined);
</script>

{#snippet actionContent()}
	<span
		class="flex size-10 shrink-0 items-center justify-center"
		style:color={trackerColors?.primary}
	>
		{#if item.icon === 'tracker' && TrackerIcon}
			<TrackerIcon class="size-7" />
		{:else if item.icon === 'sync'}
			<RefreshCw class="size-7" />
		{:else}
			<Shield class="size-7" />
		{/if}
	</span>
	<strong class="min-w-0 flex-1 text-left text-sm leading-5 font-medium">{item.title}</strong>
	<span class="flex shrink-0 items-center text-(--text)/48">
		{#if busy}
			<LoaderCircle class="size-5 animate-spin" />
		{:else}
			<ChevronRight class="size-6" />
		{/if}
	</span>
{/snippet}

<div class="overflow-hidden rounded-3xl bg-(--bg-elevated)">
	{#if item.action.type === 'navigate'}
		<a
			href={resolve(item.action.href as '/')}
			class="flex min-h-20 items-center gap-3 rounded-3xl px-4 py-4 transition-colors outline-none hover:bg-(--text)/3 focus-visible:bg-(--text)/5"
		>
			{@render actionContent()}
		</a>
	{:else}
		<button
			type="button"
			class="flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-3xl px-4 py-4 transition-colors outline-none hover:bg-(--text)/3 focus-visible:bg-(--text)/5 disabled:pointer-events-none disabled:opacity-60"
			disabled={busy}
			aria-busy={busy}
			onclick={() => onexecute(item)}
		>
			{@render actionContent()}
		</button>
	{/if}
</div>
