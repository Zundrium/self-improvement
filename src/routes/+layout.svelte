<script lang="ts">
	import '@fontsource-variable/ibm-plex-sans';
	import './layout.css';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { ModeWatcher } from 'mode-watcher';
	import { toast, Toaster } from '$lib/components/ui/toast';
	import { audioVolumeState } from '$lib/audio/audio-volume.svelte';
	import AppNavbar from '$lib/components/appNavbar.svelte';
	import BottomActionBarOutlet from '$lib/components/bottomActionBarOutlet.svelte';
	import { provideBottomActionBarState } from '$lib/components/bottomActionBarState.svelte';
	import DateSelector from '$lib/components/dateSelector.svelte';
	import GamificationToast from '$lib/components/gamificationToast.svelte';
	import { provideDateSelectorState } from '$lib/components/dateSelectorState.svelte';
	import TrackerCompleteOverlay from '$lib/components/trackerCompleteOverlay.svelte';
	import TrackerShader from '$lib/components/trackerShader.svelte';
	import TrackerTitle from '$lib/components/trackerTitle.svelte';
	import { getShopColorsForPathname, getShopFeatureForPathname } from '$lib/gamification/registry';
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
	import { listenForResume } from '$native/app';
	import { runScheduledGoogleDriveBackup } from '$native/google-drive-backup';
	import { isNativeAndroid } from '$native/platform';
	import { rescheduleBedtimeReminderFromApi } from './sleep/reminders';
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
	const selectedTracker = $derived(getTrackerForPathname(page.url.pathname));
	const selectedFeature = $derived(
		selectedTracker ?? getShopFeatureForPathname(page.url.pathname)
	);
	const standalonePage = $derived(page.url.pathname === ANDROID_SETUP_PATH);
	const appShellActive = $derived(!standalonePage);

	$effect(() => {
		const dates = dateNavigation?.markedDates ?? [];
		untrack(() => dateSelectorState.replace(dates));
	});

	$effect(() => {
		const pathname = page.url.pathname;
		if (pathname === ANDROID_SETUP_PATH || !isNativeAndroid()) return;
		untrack(() => void showStoredSyncStatus());
	});

	onMount(() => {
		audioVolumeState.hydrate();
		if (!isNativeAndroid()) {
			dismissLoadingScreen();
			return;
		}
		void initializeNativeApp();
		let removeResume = () => {};
		void listenForResume(refreshNativeApp).then((remove) => (removeResume = remove));
		return () => removeResume();
	});

	async function initializeNativeApp() {
		try {
			await syncAndroidData();
		} finally {
			dismissLoadingScreen();
		}
		void refreshNativeMaintenance();
	}

	async function refreshNativeApp() {
		await syncAndroidData();
		await refreshNativeMaintenance();
	}

	async function refreshNativeMaintenance() {
		await rescheduleBedtimeReminder();
		await runScheduledGoogleDriveBackup();
	}

	async function syncAndroidData() {
		try {
			const report = await androidSyncCoordinator.syncStale();
			if (report.results.length) await invalidateAll();
			showSyncStatus(failedTrackerIds(await mobileRepository.loadStatus()));
		} catch {
			showSyncFailure('Android data could not be synchronized.');
		}
	}

	async function rescheduleBedtimeReminder() {
		try {
			await rescheduleBedtimeReminderFromApi();
		} catch {
			return;
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
</script>

<ModeWatcher
	defaultMode="system"
	modeStorageKey="self-improvement-theme"
	themeColors={{ light: '#ffffff', dark: '#000000' }}
/>

<div
	class={appShellActive
		? 'safe-area-padding-top relative isolate flex h-svh flex-col overflow-hidden'
		: undefined}
	use:motionRoot
>
	{#if selectedTracker}
		<TrackerShader colors={selectedTracker.colors} />
	{/if}
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
	{#if appShellActive}
		<BottomActionBarOutlet />
		<AppNavbar
			profile={data.profile}
			trackers={data.enabledTrackers}
			gamification={data.gamification}
			daySummary={(page.data as DatedPageData).actionFeed?.daySummary}
		/>
	{/if}
</div>
<TrackerCompleteOverlay />
<GamificationToast gamification={data.gamification} />
<Toaster
	position="top-center"
	offset={{ top: 'calc(1rem + var(--app-safe-area-inset-top))' }}
/>
