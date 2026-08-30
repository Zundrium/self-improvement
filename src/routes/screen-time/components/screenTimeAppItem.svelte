<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Minus, Plus } from '@lucide/svelte';
	import { formatScreenTime } from '../screen-time';

	type App = { package: string; name: string; icon?: string };
	type Props = {
		app: App;
		tracked: boolean;
		minutes?: number;
		pending?: boolean;
		onchange: (app: App, tracked: boolean) => void;
	};

	let { app, tracked, minutes, pending = false, onchange }: Props = $props();
	const action = $derived(tracked ? `Stop tracking ${app.name}` : `Track ${app.name}`);
	const initial = $derived(app.name.trim().charAt(0).toUpperCase() || '?');
</script>

<div class="flex items-center gap-3 rounded-2xl bg-(--text)/4 p-3">
	{#if app.icon}
		<img class="size-11 shrink-0 rounded-xl object-cover" src={app.icon} alt="" />
	{:else}
		<div
			class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-(--text)/7 text-sm font-medium text-(--text)/56"
			aria-hidden="true"
		>
			{initial}
		</div>
	{/if}
	<div class="min-w-0 flex-1">
		<div class="flex items-baseline justify-between gap-3">
			<p class="truncate text-sm font-medium">{app.name}</p>
			{#if minutes !== undefined}
				<span class="shrink-0 text-xs text-(--text)/56 tabular-nums">
					{formatScreenTime(minutes)}
				</span>
			{/if}
		</div>
		{#if app.name !== app.package}
			<p class="truncate text-xs text-(--text)/40">{app.package}</p>
		{/if}
	</div>
	<Button
		variant="ghost"
		size="small" format="icon"
		disabled={pending}
		aria-label={action}
		title={action}
		onclick={() => onchange(app, !tracked)}
	>
		{#if tracked}
			<Minus class="size-4" />
		{:else}
			<Plus class="size-4" />
		{/if}
	</Button>
</div>
