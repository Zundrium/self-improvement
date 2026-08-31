<script lang="ts">
	import { ChevronRight, Download, LoaderCircle, RefreshCw, Shield } from '@lucide/svelte';
	import type { ActionFeedItem } from '$lib/api-types';
	import { spin } from '$lib/motion/gsap';
import { Pressable } from '$lib/components/ui/pressable';
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
		{:else if item.icon === 'update'}
			<Download class="size-7" />
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
			<span class="inline-flex" use:spin><LoaderCircle class="size-5" /></span>
		{:else}
			<ChevronRight class="size-6" />
		{/if}
	</span>
{/snippet}

<div class="action-card-container">
	{#if item.action.type === 'navigate'}
		<Pressable
			href={item.action.href}
			class="action-card relative flex min-h-20 items-center gap-3 overflow-hidden rounded-3xl bg-(--bg-elevated) px-4 py-4 hover:bg-(--text)/3 focus-visible:bg-(--text)/5"
			style={`--action-primary: ${trackerColors?.primary ?? 'var(--text)'}`}
			motionScale={{ hover: 1.01, pressed: 0.96 }}
		>
			{@render actionContent()}
		</Pressable>
	{:else}
		<Pressable
			type="button"
			class="action-card relative flex min-h-20 w-full cursor-pointer touch-manipulation items-center gap-3 overflow-hidden rounded-3xl bg-(--bg-elevated) px-4 py-4 outline-none hover:bg-(--text)/3 focus-visible:bg-(--text)/5 disabled:pointer-events-none disabled:opacity-60"
			style={`--action-primary: ${trackerColors?.primary ?? 'var(--text)'}`}
			disabled={busy}
			aria-busy={busy}
			motionScale={{ disabled: busy, hover: 1.01, pressed: 0.96 }}
			onclick={() => onexecute(item)}
		>
			{@render actionContent()}
		</Pressable>
	{/if}
</div>

<style>
	.action-card-container :global(.action-card)::before {
		position: absolute;
		top: 50%;
		left: -3rem;
		width: 12rem;
		aspect-ratio: 1;
		translate: 0 -50%;
		border-radius: 9999px;
		background: radial-gradient(
			circle,
			color-mix(in srgb, var(--action-primary) 10%, transparent),
			transparent 70%
		);
		content: '';
		pointer-events: none;
	}
</style>
