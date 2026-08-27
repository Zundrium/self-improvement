<script lang="ts">
	import { Settings } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import type { TrackerColors } from '$lib/trackers/registry';

	type TitledFeature = {
		label: string;
		colors: TrackerColors;
		settingsHref: string | null;
	};
	type Props = { tracker: TitledFeature; settingsActive?: boolean; class?: string };

	let { tracker, settingsActive = false, class: className }: Props = $props();
</script>

<div
	class={cn(
		'mx-auto grid w-full max-w-(--app-compact-max-width) grid-cols-[2rem_minmax(0,1fr)_2rem] items-center',
		className
	)}
>
	<span aria-hidden="true"></span>
	<h1 class="text-center text-sm font-medium" style={`color: ${tracker.colors.primary}`}>
		{tracker.label}
	</h1>
	{#if tracker.settingsHref}
		<Button
			href={tracker.settingsHref}
			variant="ghost"
			size="icon"
			class="size-8 bg-transparent"
			aria-label={`${tracker.label} settings`}
			aria-current={settingsActive ? 'page' : undefined}
		>
			<Settings class="size-4" style={`color: ${tracker.colors.primary}`} />
		</Button>
	{/if}
</div>
