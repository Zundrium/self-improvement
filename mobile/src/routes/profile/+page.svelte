<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Database, Settings2, SlidersHorizontal } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { signOut as endSession } from '$lib/auth-client';
	import NativeSyncCard from '$lib/components/nativeSyncCard.svelte';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import GeneralSettings from './components/generalSettings.svelte';
	import TrackerPreferences from './components/trackerPreferences.svelte';
	import type { PageProps } from './$types';

	type ProfileTab = 'general' | 'trackers' | 'data';

	let { data }: PageProps = $props();
	let activeTab = $state<ProfileTab>(tabFromUrl(untrack(() => page.url.searchParams.get('tab'))));

	function tabFromUrl(value: string | null): ProfileTab {
		return value === 'trackers' || value === 'data' ? value : 'general';
	}

	async function signOut() {
		await endSession();
		await goto(resolve('/sign-in'));
	}
</script>

<svelte:head><title>Settings · Self Improvement</title></svelte:head>

<main
	class="app-gutter mx-auto grid w-full max-w-4xl flex-1 gap-4 py-4 md:grid-cols-[280px_1fr] md:py-8"
>
	<Card class="h-fit">
		<CardContent class="items-center text-center">
			<Avatar size="xl" src={data.profileUser.image ?? undefined} alt={data.profileUser.name} />
			<div>
				<h1 class="text-xl font-semibold">{data.profileUser.name}</h1>
				<p class="text-sm text-(--text)/64">{data.profileUser.email}</p>
			</div>
			<Badge>{data.profileUser.role ?? 'user'}</Badge>
			<div class="flex flex-wrap justify-center gap-2">
				<Button href="/" variant="ghost">Home</Button>
				{#if data.profileUser.role === 'admin'}
					<Button href="/admin" variant="ghost">Users</Button>
				{/if}
				<Button type="button" variant="ghost" onclick={signOut}>Sign out</Button>
			</div>
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
				<GeneralSettings user={data.profileUser} />
			{:else if activeTab === 'trackers'}
				<TrackerPreferences trackers={data.trackerPreferences} />
			{:else}
				<NativeSyncCard />
			{/if}
		</div>
	</div>
</main>
