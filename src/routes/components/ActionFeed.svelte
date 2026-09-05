<script lang="ts">
import { Check } from '@lucide/svelte';
import type { ActionFeedItem } from '$lib/api-types';
import { Empty, EmptyMedia, EmptyTitle } from '$lib/components/ui/empty/index';
import { staggerChildren } from '$lib/motion/gsap';
import ActionFeedItemRow from './ActionFeedItem.svelte';

type Props = {
	items: ActionFeedItem[];
	busyActionId?: string;
	onexecute: (item: ActionFeedItem) => void;
};

let { items, busyActionId, onexecute }: Props = $props();
</script>

<section aria-labelledby="action-feed-title" data-motion-item>
	<h1 id="action-feed-title" class="mb-4 text-xl font-medium tracking-[-0.03em]">
		Actions Left for Today
	</h1>
	{#if items.length}
		<div class="grid gap-3" use:staggerChildren={{ delay: 0.18 }}>
			{#each items as item (item.id)}
				<ActionFeedItemRow {item} busy={busyActionId === item.id} {onexecute} />
			{/each}
		</div>
	{:else}
		<Empty class="bg-(--bg-elevated)">
			<EmptyMedia class="bg-(--status-success)/10 text-(--status-success-soft-text)">
				<Check />
			</EmptyMedia>
			<EmptyTitle>You're all caught up for today</EmptyTitle>
		</Empty>
	{/if}
</section>
