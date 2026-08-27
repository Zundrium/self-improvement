<script lang="ts">
	import { resolve } from '$app/paths';
	import { ChevronRight, LoaderCircle, RefreshCw, Shield } from '@lucide/svelte';
	import type { ActionFeedItem } from '$lib/api-types';
	import { interactionScale } from '$lib/motion/gsap';
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
	<span class="min-w-0 flex-1 text-left">
		<strong class="block text-sm leading-5 font-medium">{item.title}</strong>
		{#if item.reason}
			<span class="mt-1 block text-xs leading-4 text-(--text)/60">{item.reason}</span>
		{/if}
	</span>
	<span class="flex shrink-0 items-center text-(--text)/48">
		{#if busy}
			<LoaderCircle class="size-5" data-motion-spin />
		{:else}
			<ChevronRight class="size-6" />
		{/if}
	</span>
{/snippet}

<div>
	{#if item.action.type === 'navigate'}
		<a
			href={resolve(item.action.href as '/')}
			class="flex min-h-20 touch-manipulation items-center gap-3 overflow-hidden rounded-3xl bg-(--bg-elevated) px-4 py-4 outline-none hover:bg-(--text)/3 focus-visible:bg-(--text)/5"
			use:interactionScale={{ hover: 1.01, pressed: 0.96 }}
		>
			{@render actionContent()}
		</a>
	{:else}
		<button
			type="button"
			class="flex min-h-20 w-full cursor-pointer touch-manipulation items-center gap-3 overflow-hidden rounded-3xl bg-(--bg-elevated) px-4 py-4 outline-none hover:bg-(--text)/3 focus-visible:bg-(--text)/5 disabled:pointer-events-none disabled:opacity-60"
			disabled={busy}
			aria-busy={busy}
			use:interactionScale={{ disabled: busy, hover: 1.01, pressed: 0.96 }}
			onclick={() => onexecute(item)}
		>
			{@render actionContent()}
		</button>
	{/if}
</div>
