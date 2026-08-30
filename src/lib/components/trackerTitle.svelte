<script lang="ts">
import { ArrowLeft, Info, Settings } from '@lucide/svelte';
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
		'mx-auto grid w-full max-w-(--app-compact-max-width) grid-cols-[2rem_minmax(0,1fr)_2rem] items-center',
		className
	)}
>
	{#if settingsActive}
		<Button
			href={tracker.href}
			variant="ghost"
			size="icon"
			class="size-8 bg-transparent"
			aria-label={`Back to ${tracker.label}`}
		>
			<ArrowLeft class="size-4" style={`color: ${tracker.colors.primary}`} />
		</Button>
	{:else if tracker.infoHref}
		<a
			href={tracker.infoHref}
			target="_blank"
			rel="noreferrer"
			class="inline-flex size-8 items-center justify-center rounded-3xl bg-transparent outline-none hover:bg-(--text)/8 focus-visible:ring-2 focus-visible:ring-(--text)/20"
			aria-label={`About ${tracker.label}`}
			title={`Watch the ${tracker.label.toLowerCase()} source video on YouTube`}
		>
			<Info class="size-4" style={`color: ${tracker.colors.primary}`} />
		</a>
	{:else}
		<span aria-hidden="true"></span>
	{/if}
	<h1 class="text-center text-sm font-medium" style={`color: ${tracker.colors.primary}`}>
		{tracker.label}
	</h1>
	{#if tracker.settingsHref && !settingsActive}
		<Button
			href={tracker.settingsHref}
			variant="ghost"
			size="icon"
			class="size-8 bg-transparent"
			aria-label={`${tracker.label} settings`}
		>
			<Settings class="size-4" style={`color: ${tracker.colors.primary}`} />
		</Button>
	{:else}
		<span aria-hidden="true"></span>
	{/if}
</div>
