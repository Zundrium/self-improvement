<script lang="ts">
import { page } from '$app/state';
import { Database, Settings2, ShieldCheck, SlidersHorizontal } from '@lucide/svelte';
import { untrack } from 'svelte';
import PermissionsHub from './components/permissionsHub.svelte';
import { Avatar } from '$lib/components/ui/avatar';
import type { TrackerId } from '$domain/model';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent } from '$lib/components/ui/card';
import DataBackupCard from './components/dataBackupCard.svelte';
import GeneralSettings from './components/generalSettings.svelte';
import TrackerPreferences from './components/trackerPreferences.svelte';
import type { PageProps } from './$types';

type ProfileTab = 'general' | 'trackers' | 'permissions' | 'data';

let { data }: PageProps = $props();
let activeTab = $state<ProfileTab>(tabFromUrl(untrack(() => page.url.searchParams.get('tab'))));

function tabFromUrl(value: string | null): ProfileTab {
	return value === 'trackers' || value === 'permissions' || value === 'data' ? value : 'general';
}

function trackerFromUrl(value: string | null): TrackerId | undefined {
	if (value === 'steps' || value === 'sleep') return value;
	return value === 'screen-time' ? 'screenTime' : undefined;
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
			<Button size="medium" href="/" profile="plain">Home</Button>
		</CardContent>
	</Card>

	<div class="min-w-0 space-y-4">
		<div
			class="no-scrollbar flex gap-1 overflow-x-auto rounded-3xl bg-(--text)/5 p-1"
			role="tablist"
			aria-label="Settings sections"
		>
			<Button size="medium"
				profile={activeTab === 'general' ? 'active' : 'plain'}
				class="min-w-28 flex-1 gap-2"
				role="tab"
				aria-selected={activeTab === 'general'}
				onclick={() => (activeTab = 'general')}
			>
				<Settings2 class="size-4" /> General
			</Button>
			<Button size="medium"
				profile={activeTab === 'trackers' ? 'active' : 'plain'}
				class="min-w-28 flex-1 gap-2"
				role="tab"
				aria-selected={activeTab === 'trackers'}
				onclick={() => (activeTab = 'trackers')}
			>
				<SlidersHorizontal class="size-4" /> Trackers
			</Button>
			<Button size="medium"
				profile={activeTab === 'permissions' ? 'active' : 'plain'}
				class="min-w-28 flex-1 gap-2"
				role="tab"
				aria-selected={activeTab === 'permissions'}
				onclick={() => (activeTab = 'permissions')}
			>
				<ShieldCheck class="size-4" /> Permissions
			</Button>
			<Button size="medium"
				profile={activeTab === 'data' ? 'active' : 'plain'}
				class="min-w-28 flex-1 gap-2"
				role="tab"
				aria-selected={activeTab === 'data'}
				onclick={() => (activeTab = 'data')}
			>
				<Database class="size-4" /> Data
			</Button>
		</div>

		<div role="tabpanel">
			{#if activeTab === 'general'}
				<GeneralSettings profile={data.profile} />
			{:else if activeTab === 'trackers'}
				<TrackerPreferences trackers={data.trackerPreferences} />
			{:else if activeTab === 'permissions'}
				<PermissionsHub tracker={trackerFromUrl(page.url.searchParams.get('tracker'))} />
			{:else}
				<DataBackupCard />
			{/if}
		</div>
	</div>
</main>
