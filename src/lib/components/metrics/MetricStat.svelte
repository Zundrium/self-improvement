<script lang="ts">
import type { LucideIcon } from '@lucide/svelte';
import { cn } from '$lib/utils';

type Props = {
	icon: LucideIcon;
	value: string;
	label: string;
	iconClass?: string;
	boxed?: boolean;
};

let { icon: MetricIcon, value, label, iconClass, boxed = true }: Props = $props();
</script>

<div class="flex flex-col items-center gap-2 py-4 text-center">
	<span class={boxed ? 'flex size-10 items-center justify-center rounded-2xl bg-(--text)/6' : ''}>
		<MetricIcon class={cn('size-5', iconClass)} aria-hidden="true" />
	</span>
	<strong class="text-2xl font-medium tabular-nums">{value}</strong>
	<span class="text-xs text-(--text-muted)">{label}</span>
</div>
