<script lang="ts">
	import { Copy } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from '$lib/components/ui/toast';
	import { appTrackers, type AppTrackerId } from '$lib/trackers/registry';
	import { trackerIcons } from '$lib/trackers/icons';

	type Palette = [string, string, string];
	const atmospheres = {
		steps: 'Fresh momentum',
		sleep: 'Deep twilight',
		'screen-time': 'Electric focus',
		fitness: 'Full intensity',
		nutrition: 'Living harvest',
		meditation: 'Inner cosmos',
		breathing: 'Open air',
		stretch: 'Golden flow',
		chores: 'Bright reset',
		happiness: 'Radiant joy',
		period: 'Warm rhythm'
	} satisfies Record<AppTrackerId, string>;

	let palettes: Record<AppTrackerId, Palette> = $state(
		Object.fromEntries(
			appTrackers.map((tracker) => [
				tracker.id,
				[tracker.colors.primary, tracker.colors.secondary, tracker.colors.tertiary]
			])
		) as Record<AppTrackerId, Palette>
	);

	onMount(() => {
		const styles = getComputedStyle(document.documentElement);
		palettes = Object.fromEntries(
			appTrackers.map((tracker) => [
				tracker.id,
				(['primary', 'secondary', 'tertiary'] as const).map((tone) =>
					styles.getPropertyValue(`--tracker-${tracker.id}-${tone}`).trim().toUpperCase()
				) as Palette
			])
		) as Record<AppTrackerId, Palette>;
	});

	function gradient(colors: Palette) {
		return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 52%, ${colors[2]} 100%)`;
	}

	function updateColor(id: AppTrackerId, index: number, value: string) {
		palettes[id][index] = value.toUpperCase();
	}

	async function copyGradients() {
		const text = appTrackers
			.map((tracker) => `${tracker.label}: ${palettes[tracker.id].join(' → ')}`)
			.join('\n');
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Gradient colors copied.');
		} catch {
			toast.error('Gradient colors could not be copied.');
		}
	}
</script>

<svelte:head>
	<title>Gradient lab · Self Improvement</title>
	<meta
		name="description"
		content="Three-color atmospheric gradient concepts for the app trackers."
	/>
</svelte:head>

<main class="gradient-lab app-gutter w-full py-8 pb-10 sm:py-12">
	<div class="mx-auto max-w-6xl">
		<header class="max-w-2xl">
			<div class="flex items-center justify-between gap-4">
				<p class="text-xs font-medium tracking-[0.16em] text-(--text)/48 uppercase">Test page</p>
				<Button profile="plain" size="small" class="gap-2" onclick={copyGradients}>
					<Copy class="size-3.5" />
					Copy gradients
				</Button>
			</div>
			<h1 class="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Gradient lab</h1>
			<p class="mt-3 text-base leading-7 text-(--text)/56">
				A vibrant, three-color atmosphere for every tracker. Adjust any color to explore the
				palette live.
			</p>
		</header>

		<section class="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 xl:grid-cols-3" aria-label="Tracker gradients">
			{#each appTrackers as tracker (tracker.id)}
				{@const atmosphere = atmospheres[tracker.id]}
				{@const colors = palettes[tracker.id]}
				{@const TrackerIcon = trackerIcons[tracker.id]}
				<article
					class="gradient-atmosphere dynamic-background relative isolate flex min-h-72 overflow-hidden rounded-3xl p-6 text-(--app-on-color)"
					style:--dynamic-background={gradient(colors)}
				>
					<div class="relative z-10 flex w-full flex-col">
						<header class="flex items-start justify-between gap-4">
							<div>
								<p class="text-sm font-medium text-(--app-on-color)/72">{atmosphere}</p>
								<h2 class="mt-1 text-2xl font-semibold tracking-[-0.03em]">{tracker.label}</h2>
							</div>
							<div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-(--app-white)/16">
								<TrackerIcon class="size-6" />
							</div>
						</header>

						<div class="mt-auto grid grid-cols-3 gap-2 pt-12">
							{#each colors as color, index (`${tracker.id}-${index}`)}
								<label class="min-w-0 rounded-2xl bg-(--app-overlay-color)/16 p-2.5 backdrop-blur-sm">
									<span class="sr-only">{tracker.label} gradient color {index + 1}</span>
									<input
										type="color"
										value={color}
										class="h-7 w-full cursor-pointer rounded-xl bg-transparent"
										oninput={(event) => updateColor(tracker.id, index, event.currentTarget.value)}
									/>
									<code class="mt-1.5 block truncate text-center text-[10px] text-(--app-on-color)/80">{color}</code>
								</label>
							{/each}
						</div>
					</div>
				</article>
			{/each}
		</section>
	</div>
</main>
