<script lang="ts">
	import '@fontsource-variable/ibm-plex-sans';
	import './layout.css';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { audioVolumeState } from '$lib/audio/audio-volume.svelte';
	import AppNavbar from '$lib/components/appNavbar.svelte';
	import BottomActionBarOutlet from '$lib/components/bottomActionBarOutlet.svelte';
	import { provideBottomActionBarState } from '$lib/components/bottomActionBarState.svelte';
	import DateSelector from '$lib/components/dateSelector.svelte';
	import { provideDateSelectorState } from '$lib/components/dateSelectorState.svelte';
	import TrackerTitle from '$lib/components/trackerTitle.svelte';
	import { getShopColorsForPathname, getShopFeatureForPathname } from '$lib/gamification/registry';
	import { Toaster } from '$lib/components/ui/sonner';
	import {
		getTrackerColorsForPathname,
		getTrackerForPathname,
		type TrackerColors
	} from '$lib/trackers/registry';
	import { mobileRepository } from '$lib/api';
	import { dismissLoadingScreen, motionRoot, pageEnter } from '$lib/motion/gsap';
	import type { ActionFeedData } from '$lib/api-types';
	import type { TrackerId } from '$domain/model';
	import { failedTrackerIds } from '$domain/status';
	import { androidSyncCoordinator } from '$native/android-data';
	import { ANDROID_SETUP_PATH } from '$native/android-setup';
	import { getLaunchUrl, listenForAppUrls, listenForResume } from '$native/app';
	import { isNativeAndroid } from '$native/platform';
	import type { LayoutProps } from './$types';

	type DatedPageData = {
		date?: string;
		today?: string;
		markedDates?: string[];
		completedDays?: Array<{ dateKey: string }>;
		meditationHistory?: Array<{ localDate: string }>;
		trackedDates?: string[];
		actionFeed?: ActionFeedData;
	};
	type DateNavigation = {
		date: string;
		today: string;
		markedDates: string[];
		colors: TrackerColors[];
		hrefForDate: (date: string) => string;
	};

	const ANDROID_SYNC_TOAST = 'android-sync-failure';
	let { data, children }: LayoutProps = $props();
	const initialPageData = page.data as DatedPageData;
	const dateSelectorState = provideDateSelectorState(markedDates(initialPageData));
	provideBottomActionBarState();
	const dateNavigation = $derived(
		createDateNavigation(page.url.pathname, page.data as DatedPageData)
	);
	const selectedFeature = $derived(
		getTrackerForPathname(page.url.pathname) ?? getShopFeatureForPathname(page.url.pathname)
	);
	const standalonePage = $derived(
		page.url.pathname === '/nutrition/track' || page.url.pathname === ANDROID_SETUP_PATH
	);
	const appShellActive = $derived(Boolean(data.user) && !standalonePage);

	$effect(() => {
		const dates = dateNavigation?.markedDates ?? [];
		untrack(() => dateSelectorState.replace(dates));
	});

	$effect(() => {
		const pathname = page.url.pathname;
		if (!data.user || pathname === ANDROID_SETUP_PATH || !isNativeAndroid()) return;
		untrack(() => void showStoredSyncStatus());
	});

	onMount(() => {
		dismissLoadingScreen();
		audioVolumeState.hydrate();
		if (!isNativeAndroid()) return;
		if (data.user) void syncAndroidData();
		let removeResume = () => {};
		let removeUrls = () => {};
		void listenForResume(async () => {
			if (data.user) await syncAndroidData();
		}).then((remove) => (removeResume = remove));
		void getLaunchUrl().then((url) => url && openAppUrl(url));
		void listenForAppUrls(openAppUrl).then((remove) => (removeUrls = remove));
		return () => {
			removeResume();
			removeUrls();
		};
	});

	async function syncAndroidData() {
		try {
			const report = await androidSyncCoordinator.syncStale();
			if (report.results.length) await invalidateAll();
			showSyncStatus(failedTrackerIds(await mobileRepository.loadStatus()));
		} catch {
			showSyncFailure('Android data could not be synchronized.');
		}
	}

	async function showStoredSyncStatus() {
		try {
			showSyncStatus(failedTrackerIds(await mobileRepository.loadStatus()));
		} catch {
			showSyncFailure('Android data status could not be read.');
		}
	}

	function showSyncStatus(trackers: TrackerId[]) {
		if ([ANDROID_SETUP_PATH, '/'].includes(page.url.pathname)) return;
		if (!trackers.length) return void toast.dismiss(ANDROID_SYNC_TOAST);
		const labels = trackers.map(trackerLabel).join(', ');
		showSyncFailure(`Review ${labels} under Profile.`);
	}

	function showSyncFailure(description: string) {
		toast.error('Some Android data is not being processed.', {
			id: ANDROID_SYNC_TOAST,
			description,
			action: { label: 'Review', onClick: () => location.assign(`${resolve('/profile')}?tab=data`) }
		});
	}

	function trackerLabel(tracker: TrackerId) {
		return tracker === 'screenTime' ? 'Screen time' : tracker[0].toUpperCase() + tracker.slice(1);
	}

	function createDateNavigation(
		pathname: string,
		pageData: DatedPageData
	): DateNavigation | undefined {
		if (pathname.endsWith('/settings')) return;
		const date = pageData.date ?? pageData.actionFeed?.date;
		const today = pageData.today ?? pageData.actionFeed?.daySummary.today;
		if (!date || !today) return;
		return {
			date,
			today,
			markedDates: markedDates(pageData),
			colors: dateSelectorColors(pathname),
			hrefForDate: (selectedDate) => dateHref(pathname, selectedDate, today)
		};
	}

	function dateSelectorColors(pathname: string) {
		const colors = getTrackerColorsForPathname(pathname) ?? getShopColorsForPathname(pathname);
		return colors ? [colors] : [];
	}

	function markedDates(pageData: DatedPageData) {
		if (pageData.markedDates) return pageData.markedDates;
		if (pageData.completedDays) return pageData.completedDays.map((day) => day.dateKey);
		if (pageData.meditationHistory) return pageData.meditationHistory.map((day) => day.localDate);
		return pageData.trackedDates ?? [];
	}

	function dateHref(pathname: string, date: string, today: string) {
		if (pathname.startsWith('/nutrition/log/')) return `/nutrition/log/${date}`;
		if (date === today) return pathname;
		return `${pathname}?date=${date}`;
	}

	function openAppUrl(url: URL) {
		if (url.protocol !== 'selfimprovement:' || url.host !== 'reset-password') return;
		void goto(resolve(`/reset-password${url.search}` as '/reset-password'));
	}
</script>

<ModeWatcher
	defaultMode="system"
	modeStorageKey="self-improvement-theme"
	themeColors={{ light: '#ffffff', dark: '#000000' }}
/>

<div
	class={appShellActive ? 'safe-area-padding-top flex h-svh flex-col overflow-hidden' : undefined}
	use:motionRoot
>
	{#if dateNavigation || selectedFeature}
		<div class="app-gutter shrink-0 py-(--app-header-padding-block)">
			{#if dateNavigation}
				<DateSelector
					date={dateNavigation.date}
					today={dateNavigation.today}
					markedDates={[...dateSelectorState.markedDates]}
					colors={dateNavigation.colors}
					hrefForDate={dateNavigation.hrefForDate}
				/>
			{/if}
			{#if selectedFeature}
				<TrackerTitle
					tracker={selectedFeature}
					settingsActive={page.url.pathname.endsWith('/settings')}
					class={dateNavigation ? 'mt-2' : undefined}
				/>
			{/if}
		</div>
	{/if}
	{#key page.route.id}
		<div class={appShellActive ? 'flex min-h-0 flex-1 flex-col overflow-y-auto' : undefined}>
			<div class="contents" use:pageEnter>{@render children()}</div>
		</div>
	{/key}
	{#if data.user && appShellActive}
		<BottomActionBarOutlet />
		<AppNavbar
			user={data.user}
			trackers={data.enabledTrackers}
			daySummary={(page.data as DatedPageData).actionFeed?.daySummary}
		/>
	{/if}
</div>
<Toaster
	position="bottom-center"
	richColors
	offset={appShellActive ? { bottom: 'calc(5rem + env(safe-area-inset-bottom))' } : undefined}
/>
