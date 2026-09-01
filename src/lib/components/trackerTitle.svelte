<script lang="ts">
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { Info, Settings } from '@lucide/svelte';
import { Button } from '$lib/components/ui/button';
import { cn } from '$lib/utils';
import type { TrackerColors } from '$lib/trackers/registry';

type TitledFeature = {
	label: string;
	href: string;
	colors: TrackerColors;
	settingsHref: string | null;
	infoHref?: string;
};
type Props = { tracker: TitledFeature; settingsActive?: boolean; class?: string };

let { tracker, settingsActive = false, class: className }: Props = $props();
</script>

<div
	class={cn(
		'mx-auto grid w-full max-w-(--app-compact-max-width) items-center',
		'grid-cols-[3rem_minmax(0,1fr)_3rem]',
		className
	)}
>
	{#if !settingsActive && tracker.infoHref}
		<Button
			href={tracker.infoHref}
			target="_blank"
			rel="noreferrer"
			variant="ghost"
			size="medium" format="icon"
			aria-label={`About ${tracker.label}`}
			title={`Watch the ${tracker.label.toLowerCase()} source video on YouTube`}
		>
			<Info class="size-4" style={`color: ${tracker.colors.secondary}`} />
		</Button>
	{:else}
		<span aria-hidden="true"></span>
	{/if}
	<h1 class="text-center text-sm font-medium" style={`color: ${tracker.colors.secondary}`}>
		{tracker.label}{settingsActive ? ' settings' : ''}
	</h1>
	{#if tracker.settingsHref && !settingsActive}
		<Button
			type="button"
			variant="ghost"
			size="medium" format="icon"
			class="bg-transparent hover:bg-transparent"
			aria-label={`${tracker.label} settings`}
			onclick={() => void goto(resolve(tracker.settingsHref as '/'))}
		>
			<Settings class="size-4" style={`color: ${tracker.colors.secondary}`} />
		</Button>
	{:else}
		<span aria-hidden="true"></span>
	{/if}
</div>
