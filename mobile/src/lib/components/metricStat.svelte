<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	type Props = {
		icon: LucideIcon;
		value: string;
		label: string;
		iconClass?: string;
	};

	let { icon: MetricIcon, value, label, iconClass }: Props = $props();
</script>

<div class="flex flex-col items-center gap-2 py-4 text-center">
	<MetricIcon class={cn('size-5', iconClass)} />
	<strong class="text-2xl font-medium tabular-nums">{value}</strong>
	<span class="text-xs text-(--text)/48">{label}</span>
</div>
