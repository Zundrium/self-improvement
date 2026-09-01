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
	const actionColorStyle = $derived(
		[
			`--action-primary: ${trackerColors?.primary ?? 'var(--text)'}`,
			`--action-secondary: ${trackerColors?.secondary ?? 'var(--text)'}`,
			`--action-tertiary: ${trackerColors?.tertiary ?? 'var(--text)'}`
		].join('; ')
	);
</script>

{#snippet actionContent()}
	<span
		class="flex size-10 shrink-0 items-center justify-center"
		style:color="color-mix(in srgb, var(--action-secondary) 50%, white)"
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
			style={actionColorStyle}
			motionScale={{ hover: 1.01, pressed: 0.96 }}
		>
			{@render actionContent()}
		</Pressable>
	{:else}
		<Pressable
			type="button"
			class="action-card relative flex min-h-20 w-full cursor-pointer touch-manipulation items-center gap-3 overflow-hidden rounded-3xl bg-(--bg-elevated) px-4 py-4 outline-none hover:bg-(--text)/3 focus-visible:bg-(--text)/5 disabled:pointer-events-none disabled:opacity-60"
			style={actionColorStyle}
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
		inset-block: 0;
		left: 0;
		width: 80%;
		background: linear-gradient(
			to right,
			color-mix(in srgb, var(--action-primary) 14%, transparent) 0%,
			color-mix(in srgb, var(--action-secondary) 10%, transparent) 34%,
			color-mix(in srgb, var(--action-tertiary) 8%, transparent) 62%,
			transparent 100%
		);
		content: '';
		pointer-events: none;
	}
</style>
