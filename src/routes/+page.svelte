<script lang="ts">
import { page } from '$app/state';
import { untrack } from 'svelte';
import type { ActionFeedData, ActionFeedItem, AppBootstrapData } from '$lib/api-types';
import { toast } from '$lib/components/ui/toast';
import { androidSyncCoordinator } from '$native/android-data';
import { installAndroidUpdate } from '$native/android-updater';
import { loadNativeActionFeedItems } from '$native/action-feed';
import ActionFeed from './components/ActionFeed.svelte';
import { mergeActionFeedItems, millisecondsUntilNextMinute } from './action-feed';
import type { PageProps } from './$types';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';

let { data }: PageProps = $props();
let actionFeed = $state<ActionFeedData>(untrack(() => data.actionFeed));
let nativeItems = $state<ActionFeedItem[]>(untrack(() => data.nativeItems));
let busyActionId = $state('');
const items = $derived(mergeActionFeedItems(actionFeed.items, nativeItems));

$effect(() => {
	const updatedActionFeed = data.actionFeed;
	untrack(() => {
		actionFeed = updatedActionFeed;
	});
});

$effect(() => {
	let active = true;
	const trackerIds = (data as AppBootstrapData).enabledTrackers.map(({ id }) => id);
	void loadNativeActionFeedItems(trackerIds)
		.then((items) => {
			if (active) nativeItems = items;
		})
		.catch(() => {
			if (active) nativeItems = [];
		});
	return () => {
		active = false;
	};
});

$effect(() => {
	if (page.url.searchParams.has('date')) return;
	let active = true;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const refreshAtNextMinute = () => {
		timer = setTimeout(async () => {
			try {
				await refreshAppData(APP_RESOURCES.actionFeed, APP_RESOURCES.bootstrap);
			} catch (error) {
				console.error('Action feed refresh failed:', error);
			} finally {
				if (active) refreshAtNextMinute();
			}
		}, millisecondsUntilNextMinute(new Date()));
	};

	refreshAtNextMinute();
	return () => {
		active = false;
		if (timer) clearTimeout(timer);
	};
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
	if (action.type === 'install-android-update') return installAndroidUpdate(action);
	await androidSyncCoordinator.sync(action.trackerIds);
	await refreshAppData(APP_RESOURCES.actionFeed, APP_RESOURCES.bootstrap);
}
</script>

<svelte:head>
	<title>Today · Self Improvement</title>
	<meta name="description" content="Everything that needs your attention today." />
</svelte:head>

<main class="app-gutter flex flex-1 items-start justify-center py-4 pb-6">
	<div class="w-full max-w-(--app-compact-max-width)">
		<ActionFeed {items} {busyActionId} onexecute={(item) => void executeAction(item)} />
	</div>
</main>
