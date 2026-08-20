<script lang="ts">
	import { Check, LoaderCircle, type LucideIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	type TrackerState = 'complete' | 'attention' | 'incomplete';
	type Props = {
		href: string;
		label: string;
		icon: LucideIcon;
		description?: string;
		variant?: 'compact' | 'summary';
		state?: TrackerState;
		active?: boolean;
		pending?: boolean;
		onSelect?: () => void;
	};

	let {
		href,
		label,
		icon: TrackerIcon,
		description,
		variant = 'summary',
		state = 'incomplete',
		active = false,
		pending = false,
		onSelect
	}: Props = $props();

	const compact = $derived(variant === 'compact');
	const stateDescription = $derived(
		state === 'complete' ? ', complete' : state === 'attention' ? ', needs attention' : ''
	);
	const buttonClass = $derived(
		compact
			? 'h-auto min-w-0 flex-col gap-2 rounded-2xl bg-transparent px-2 py-3 text-center whitespace-normal hover:bg-(--text)/6'
			: 'h-32 min-w-0 flex-col gap-2 rounded-3xl bg-transparent px-2.5 py-3 text-center whitespace-normal hover:bg-transparent'
	);
</script>

<Button
	{href}
	variant="ghost"
	class={buttonClass}
	data-state={state}
	aria-label={`${label}${description ? `: ${description}` : ''}${stateDescription}`}
	aria-current={active ? 'page' : undefined}
	aria-busy={pending}
	onclick={onSelect}
>
	<span class="relative shrink-0">
		<span
			class={compact
				? `flex size-10 items-center justify-center rounded-2xl ${active ? 'bg-(--text) text-(--bg)' : 'bg-(--text)/6'}`
				: 'flex size-14 items-center justify-center rounded-2xl bg-(--text)/6'}
		>
			{#if pending}
				<LoaderCircle class={compact ? 'size-5 animate-spin' : 'size-8 animate-spin'} />
			{:else}
				<TrackerIcon class={compact ? 'size-5' : 'size-8'} />
			{/if}
		</span>
		{#if !compact && state !== 'incomplete'}
			<span
				class="absolute -top-1.5 -right-1.5 flex size-5.5 items-center justify-center rounded-full text-white ring-2 ring-(--bg) {state ===
				'complete'
					? 'bg-(--chart-2)'
					: 'bg-(--chart-3)'}"
				aria-hidden="true"
			>
				{#if state === 'complete'}
					<Check class="size-3.5" strokeWidth={3} />
				{:else}
					<span class="text-sm leading-none font-bold">!</span>
				{/if}
			</span>
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
