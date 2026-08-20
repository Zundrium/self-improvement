<script lang="ts">
	import { Check, LoaderCircle, type LucideIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	type Props = {
		href: string;
		label: string;
		icon: LucideIcon;
		description?: string;
		variant?: 'compact' | 'summary';
		active?: boolean;
		complete?: boolean;
		pending?: boolean;
		onSelect?: () => void;
	};

	let {
		href,
		label,
		icon: TrackerIcon,
		description,
		variant = 'summary',
		active = false,
		complete = false,
		pending = false,
		onSelect
	}: Props = $props();

	const compact = $derived(variant === 'compact');
	const buttonClass = $derived(
		compact
			? 'h-auto min-w-0 flex-col gap-2 rounded-2xl bg-transparent px-2 py-3 text-center whitespace-normal hover:bg-(--text)/6'
			: 'relative h-32 min-w-0 flex-col gap-2 rounded-3xl bg-transparent px-2.5 py-3 text-center whitespace-normal hover:bg-transparent'
	);
</script>

<Button
	{href}
	variant="ghost"
	class={buttonClass}
	aria-label={`${label}${description ? `: ${description}` : ''}${complete ? ', complete' : ''}`}
	aria-current={active ? 'page' : undefined}
	aria-busy={pending}
	onclick={onSelect}
>
	{#if complete && !compact}
		<span
			class="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-(--chart-2) text-white"
			aria-hidden="true"
		>
			<Check class="size-3.5" strokeWidth={3} />
		</span>
	{/if}
	<span
		class={compact
			? `flex size-10 shrink-0 items-center justify-center rounded-2xl ${active ? 'bg-(--text) text-(--bg)' : 'bg-(--text)/6'}`
			: 'flex size-14 shrink-0 items-center justify-center rounded-2xl bg-(--text)/6'}
	>
		{#if pending}
			<LoaderCircle class={compact ? 'size-5 animate-spin' : 'size-8 animate-spin'} />
		{:else}
			<TrackerIcon class={compact ? 'size-5' : 'size-8'} />
		{/if}
	</span>
	<span class="w-full min-w-0">
		<strong class="block truncate text-sm font-medium">{label}</strong>
		{#if description}
			<span class="mt-0.5 line-clamp-2 block text-xs leading-4 text-(--text)/48 tabular-nums">
				{description}
			</span>
		{/if}
	</span>
</Button>
