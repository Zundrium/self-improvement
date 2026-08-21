<script lang="ts">
	import { Check } from '@lucide/svelte';
	import type { ActionFeedItem } from '$lib/api-types';
	import { Empty, EmptyMedia, EmptyTitle } from '$lib/components/ui/empty';
	import ActionFeedItemRow from './actionFeedItem.svelte';

	type Props = {
		items: ActionFeedItem[];
		busyActionId?: string;
		onexecute: (item: ActionFeedItem) => void;
	};

	let { items, busyActionId, onexecute }: Props = $props();
</script>

<section aria-labelledby="action-feed-title">
	<h1 id="action-feed-title" class="mb-4 text-xl font-medium tracking-[-0.03em]">
		Actions Left for Today
	</h1>
	{#if items.length}
		<div class="grid gap-3">
			{#each items as item (item.id)}
				<ActionFeedItemRow {item} busy={busyActionId === item.id} {onexecute} />
			{/each}
		</div>
	{:else}
		<Empty class="bg-(--bg-elevated)">
			<EmptyMedia class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
				<Check />
			</EmptyMedia>
			<EmptyTitle>You're all caught up for today</EmptyTitle>
		</Empty>
	{/if}
</section>
