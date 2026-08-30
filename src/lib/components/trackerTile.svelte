<script lang="ts">
	import { Check, LoaderCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { TrackerIconComponent } from '$lib/trackers/icons';
	import type { TrackerColors } from '$lib/trackers/registry';

	type TrackerState = 'complete' | 'attention' | 'incomplete';
	type Props = {
		href: string;
		label: string;
		icon: TrackerIconComponent;
		colors: TrackerColors;
		description?: string;
		state?: TrackerState;
		active?: boolean;
		pending?: boolean;
		onSelect?: () => void;
	};

	let {
		href,
		label,
		icon: TrackerIcon,
		colors,
		description,
		state = 'incomplete',
		active = false,
		pending = false,
		onSelect
	}: Props = $props();

	const stateDescription = $derived(
		state === 'complete' ? ', complete' : state === 'attention' ? ', needs attention' : ''
	);
</script>

<Button
	{href}
	variant="ghost"
	class="h-32 min-w-0 flex-col gap-2 rounded-3xl bg-transparent px-2.5 py-3 text-center whitespace-normal hover:bg-transparent"
	data-state={state}
	aria-label={`${label}${description ? `: ${description}` : ''}${stateDescription}`}
	aria-current={active ? 'page' : undefined}
	aria-busy={pending}
	onclick={onSelect}
>
	<span class="relative shrink-0">
		<span
			class="flex size-14 items-center justify-center rounded-2xl text-white"
			style={`background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`}
		>
			{#if pending}
				<LoaderCircle class="size-8" data-motion-spin />
			{:else}
				<TrackerIcon class="size-8" />
			{/if}
		</span>
		{#if state !== 'incomplete'}
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
