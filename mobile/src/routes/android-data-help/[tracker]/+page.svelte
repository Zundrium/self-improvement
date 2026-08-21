<script lang="ts">
	import { ArrowLeft, Footprints, Moon, Smartphone } from '@lucide/svelte';
	import NativeSyncCard from '$lib/components/nativeSyncCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import ScreenTimeGuide from '../components/screenTimeGuide.svelte';
	import SleepGuide from '../components/sleepGuide.svelte';
	import StepsGuide from '../components/stepsGuide.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const details = {
		steps: {
			label: 'Steps',
			title: 'Set up step measurement',
			description:
				'Choose what counts your steps, connect it to Health Connect, and verify every link.'
		},
		sleep: {
			label: 'Sleep',
			title: 'Set up sleep measurement',
			description:
				'Use your Galaxy Watch as the measuring source and Samsung Health as the connection.'
		},
		'screen-time': {
			label: 'Screen time',
			title: 'Set up screen-time measurement',
			description: 'Allow Self Improvement to read Android’s app-usage history directly.'
		}
	} as const;
	const guide = $derived(details[data.tracker]);
</script>

<svelte:head>
	<title>{guide.label} setup · Self Improvement</title>
	<meta name="description" content={guide.description} />
</svelte:head>

<main class="app-gutter mx-auto w-full max-w-3xl flex-1 space-y-6 py-6 pb-10 sm:py-10">
	<Button href="/android-data-help" size="sm" variant="ghost">
		<ArrowLeft class="size-4" /> All Android guides
	</Button>

	<header class="max-w-2xl">
		<span class="mb-5 flex size-12 items-center justify-center rounded-3xl bg-(--text) text-(--bg)">
			{#if data.tracker === 'steps'}
				<Footprints class="size-6" />
			{:else if data.tracker === 'sleep'}
				<Moon class="size-6" />
			{:else}
				<Smartphone class="size-6" />
			{/if}
		</span>
		<h1 class="text-3xl font-medium tracking-[-0.05em]">{guide.title}</h1>
		<p class="mt-2 leading-6 text-(--text)/56">{guide.description}</p>
	</header>

	{#if data.tracker === 'steps'}
		<StepsGuide />
	{:else if data.tracker === 'sleep'}
		<SleepGuide />
	{:else}
		<ScreenTimeGuide />
	{/if}

	<NativeSyncCard
		showHelpLink={false}
		tracker={data.tracker === 'screen-time' ? 'screenTime' : data.tracker}
	/>
</main>
