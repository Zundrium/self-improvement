<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';

	let time = $state(new Date());
	let interval: ReturnType<typeof setInterval> | undefined;
	const hours = $derived(time.getHours());
	const isEatingWindow = $derived(hours >= 10 && hours < 14);
	const formattedTime = $derived(
		time.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit'
		})
	);

	onMount(() => {
		interval = setInterval(() => (time = new Date()), 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<Card class="items-center gap-3 bg-transparent p-0 text-center shadow-none">
	<p
		class="text-[clamp(4.5rem,18vw,8rem)] leading-none font-semibold tracking-[-0.08em] tabular-nums"
	>
		{formattedTime}
	</p>
	<Badge class={isEatingWindow ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' : ''}>
		<span
			class={`size-1.5 rounded-full ${isEatingWindow ? 'animate-pulse bg-emerald-500' : 'bg-(--text)/40'}`}
		></span>
		{isEatingWindow ? 'Fueling window · 10:00–14:00' : 'Fasting mode active'}
	</Badge>
</Card>
