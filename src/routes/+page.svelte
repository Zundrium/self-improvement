<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import type { ActionFeedItem } from '$lib/api-types';
	import GameBar from '$lib/components/gameBar.svelte';
	import { androidHealth, androidSyncCoordinator, androidUsage } from '$native/android-data';
	import { installAndroidUpdate } from '$native/android-updater';
	import ActionFeed from './actionFeed.svelte';
	import { mergeActionFeedItems } from './action-feed';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let nativeItems = $state(untrack(() => data.nativeItems));
	let busyActionId = $state('');
	const items = $derived(mergeActionFeedItems(data.actionFeed.items, nativeItems));

	$effect(() => {
		const updatedNativeItems = data.nativeItems;
		untrack(() => (nativeItems = updatedNativeItems));
	});

	async function executeAction(item: ActionFeedItem) {
		if (item.action.type === 'navigate' || busyActionId) return;
		busyActionId = item.id;
		try {
			await runNativeAction(item.action);
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'The action could not be completed.');
		} finally {
			busyActionId = '';
		}
	}

	async function runNativeAction(action: Exclude<ActionFeedItem['action'], { type: 'navigate' }>) {
		if (action.type === 'open-usage-access') return androidUsage.openSettings();
		if (action.type === 'install-android-update') return installAndroidUpdate(action);
		if (action.type === 'request-health-access') {
			await androidHealth.requestReadPermissions();
			await androidSyncCoordinator.sync(action.trackerIds);
		}
		if (action.type === 'sync-android-data') {
			await androidSyncCoordinator.sync(action.trackerIds);
		}
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Today · Self Improvement</title>
	<meta name="description" content="Everything that needs your attention today." />
</svelte:head>

<main class="app-gutter flex flex-1 items-start justify-center py-4 pb-6">
	<div class="w-full max-w-(--app-compact-max-width)">
		{#if data.gamification}
			<GameBar
				gamification={data.gamification}
				date={data.actionFeed.date}
				today={data.actionFeed.daySummary.today}
			/>
		{/if}
		<div class="mt-3">
			<ActionFeed {items} {busyActionId} onexecute={(item) => void executeAction(item)} />
		</div>
	</div>
</main>
