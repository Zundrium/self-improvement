<script lang="ts">
	import { page } from '$app/state';
	import { Database, Settings2, SlidersHorizontal } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import NativeSyncCard from '$lib/components/nativeSyncCard.svelte';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import DataBackupCard from './components/dataBackupCard.svelte';
	import GeneralSettings from './components/generalSettings.svelte';
	import TrackerPreferences from './components/trackerPreferences.svelte';
	import type { PageProps } from './$types';

	type ProfileTab = 'general' | 'trackers' | 'data';

	let { data }: PageProps = $props();
	let activeTab = $state<ProfileTab>(tabFromUrl(untrack(() => page.url.searchParams.get('tab'))));

	function tabFromUrl(value: string | null): ProfileTab {
		return value === 'trackers' || value === 'data' ? value : 'general';
	}
</script>

<svelte:head><title>Settings · Self Improvement</title></svelte:head>

<main
	class="app-gutter mx-auto grid w-full max-w-4xl flex-1 gap-4 py-4 md:grid-cols-[280px_1fr] md:py-8"
>
	<Card class="h-fit">
		<CardContent class="items-center text-center">
			<Avatar size="xl" alt={data.profile.name} />
			<h1 class="text-xl font-semibold">{data.profile.name}</h1>
			<Button href="/" variant="ghost">Home</Button>
		</CardContent>
	</Card>

	<div class="min-w-0 space-y-4">
		<div
			class="grid grid-cols-3 gap-1 rounded-3xl bg-(--text)/5 p-1"
			role="tablist"
			aria-label="Settings sections"
		>
			<Button
				variant={activeTab === 'general' ? 'default' : 'ghost'}
				class="min-w-0 gap-2 px-2"
				role="tab"
				aria-selected={activeTab === 'general'}
				onclick={() => (activeTab = 'general')}
			>
				<Settings2 class="size-4" /> <span class="truncate">General</span>
			</Button>
			<Button
				variant={activeTab === 'trackers' ? 'default' : 'ghost'}
				class="min-w-0 gap-2 px-2"
				role="tab"
				aria-selected={activeTab === 'trackers'}
				onclick={() => (activeTab = 'trackers')}
			>
				<SlidersHorizontal class="size-4" /> <span class="truncate">Trackers</span>
			</Button>
			<Button
				variant={activeTab === 'data' ? 'default' : 'ghost'}
				class="min-w-0 gap-2 px-2"
				role="tab"
				aria-selected={activeTab === 'data'}
				onclick={() => (activeTab = 'data')}
			>
				<Database class="size-4" /> <span class="truncate">Data</span>
			</Button>
		</div>

		<div role="tabpanel">
			{#if activeTab === 'general'}
				<GeneralSettings profile={data.profile} />
			{:else if activeTab === 'trackers'}
				<TrackerPreferences trackers={data.trackerPreferences} />
			{:else}
				<div class="space-y-4">
					<DataBackupCard />
					<NativeSyncCard />
				</div>
			{/if}
		</div>
	</div>
</main>
