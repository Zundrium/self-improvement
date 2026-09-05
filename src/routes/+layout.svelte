<script lang="ts">
import '@fontsource-variable/ibm-plex-sans';
import { APP_RESTORED_EVENT } from '$lib/app/restore';
import { recordDiagnostic } from '$lib/app/diagnostics';
import { listenForBack } from '$native/back-navigation';
import './global.css';
import { goto, invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { onMount, untrack } from 'svelte';
import { ModeWatcher } from 'mode-watcher';
import { toast, Toaster } from '$lib/components/ui/toast';
import { audioVolumeState } from '$lib/audio/audio-volume.svelte';
import AppNavbar from '$lib/components/app/AppNavbar.svelte';
import BottomActionBarOutlet from '$lib/components/app/BottomActionBarOutlet.svelte';
import { provideBottomActionBarState } from '$lib/components/app/action-bar-context.svelte';
import DateSelector from '$lib/components/tracker/DateSelector.svelte';
import GamificationToast from '$lib/components/gamification/GamificationToast.svelte';
import { provideDateSelectorState } from '$lib/components/tracker/date-selection-context.svelte';
import TrackerCompleteOverlay from '$lib/components/gamification/TrackerCompleteOverlay.svelte';
import TrackerTitle from '$lib/components/tracker/TrackerTitle.svelte';
import { getShopColorsForPathname, getShopFeatureForPathname } from '$lib/gamification/registry';
import {
	getTrackerColorsForPathname,
	getTrackerForPathname,
	type TrackerColors
} from '$lib/trackers/registry';
import { mobileRepository } from '$lib/api';
import { dismissLoadingScreen, motionRoot, pageEnter } from '$lib/motion/gsap';
import { dateNavigationKey } from '$lib/motion/date-navigation';
import type { ActionFeedData } from '$lib/api-types';
import type { AppBootstrapData } from '$lib/api-types';
import type { TrackerId } from '$domain/model';
import { failedTrackerIds } from '$domain/status';
import { millisecondsUntilNextLocalMidnight } from '$lib/utils';
import { androidSyncCoordinator, enabledNativeTrackerIds } from '$native/android-data';
import { ANDROID_SETUP_PATH } from '$native/android-setup';
import { listenForResume } from '$native/app';
import { runScheduledGoogleDriveBackup } from '$native/google-drive-backup';
import { isNativeAndroid } from '$native/platform';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { rescheduleBedtimeReminderFromApi } from './sleep/reminders';
import { GAMIFICATION_CHANGED_EVENT } from '$lib/api';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
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
let nativeRefresh: Promise<void> | undefined;
let restoreRevision = $state(0);
let retryingStartup = $state(false);
let { data, children }: LayoutProps = $props();
const startupError = $derived((data as { startupError?: string }).startupError);
const bootstrapData = $derived(data as AppBootstrapData);
const initialPageData = page.data as DatedPageData;
const dateSelectorState = provideDateSelectorState(markedDates(initialPageData));
provideBottomActionBarState();
const dateNavigation = $derived(
	createDateNavigation(page.url.pathname, page.data as DatedPageData)
);
const selectedTracker = $derived(getTrackerForPathname(page.url.pathname));
const selectedFeature = $derived(selectedTracker ?? getShopFeatureForPathname(page.url.pathname));
const standalonePage = $derived(page.url.pathname === ANDROID_SETUP_PATH);
const appShellActive = $derived(!standalonePage);

$effect(() => {
	const colors = selectedFeature?.colors;
	const root = document.documentElement;
	if (!colors) {
		root.removeAttribute('data-tracker-theme');
		root.style.removeProperty('--tracker-color-primary');
		root.style.removeProperty('--tracker-color-middle');
		root.style.removeProperty('--tracker-color-tertiary');
		return;
	}
	root.dataset.trackerTheme = selectedFeature.id;
	root.style.setProperty('--tracker-color-primary', colors.primary);
	root.style.setProperty('--tracker-color-middle', colors.secondary);
	root.style.setProperty('--tracker-color-tertiary', colors.tertiary);
});

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
	dismissLoadingScreen();
	let disposed = false;
	let removeResume: (() => void) | undefined;
	let removeBack: (() => void) | undefined;
	const onRestore = () => {
		dateSelectorState.replace([]);
		restoreRevision++;
	};
	window.addEventListener(APP_RESTORED_EVENT, onRestore);
	const onGamificationChanged = () =>
		void refreshAppData(APP_RESOURCES.bootstrap, APP_RESOURCES.gamification);
	window.addEventListener(GAMIFICATION_CHANGED_EVENT, onGamificationChanged);
	let midnightTimer: ReturnType<typeof setTimeout> | undefined;

	const refreshAtMidnight = () => {
		midnightTimer = setTimeout(async () => {
			await refreshForNewDay().catch(() => undefined);
			if (!disposed) refreshAtMidnight();
		}, millisecondsUntilNextLocalMidnight());
	};
	const handleVisibilityChange = () => {
		if (document.visibilityState === 'visible') void refreshForNewDay().catch(() => undefined);
	};

	refreshAtMidnight();
	document.addEventListener('visibilitychange', handleVisibilityChange);
	if (isNativeAndroid()) {
		void refreshNativeApp().catch(() => undefined);
		void listenForBack()
			.then((remove) => {
				if (disposed) remove();
				else removeBack = remove;
			})
			.catch(() => undefined);
		void listenForResume(refreshForNewDay)
			.then((remove) => {
				if (disposed) remove();
				else removeResume = remove;
			})
			.catch(() => undefined);
	}
	return () => {
		disposed = true;
		if (midnightTimer) clearTimeout(midnightTimer);
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		removeResume?.();
		removeBack?.();
		window.removeEventListener(APP_RESTORED_EVENT, onRestore);
		window.removeEventListener(GAMIFICATION_CHANGED_EVENT, onGamificationChanged);
	};
});

async function refreshForNewDay() {
	if (document.visibilityState !== 'visible') return;
	await invalidateAll();
	if (isNativeAndroid()) await refreshNativeApp();
}

function refreshNativeApp() {
	if (document.visibilityState !== 'visible') return Promise.resolve();
	nativeRefresh ??= runNativeRefresh().finally(() => (nativeRefresh = undefined));
	return nativeRefresh;
}

async function runNativeRefresh() {
	await syncAndroidData();
	if (document.visibilityState !== 'visible') return;
	await refreshNativeMaintenance();
}

async function refreshNativeMaintenance() {
	await rescheduleBedtimeReminder();
	if (document.visibilityState !== 'visible') return;
	await runScheduledGoogleDriveBackup();
}

async function syncAndroidData() {
	try {
		const report = await androidSyncCoordinator.syncStale();
		if (document.visibilityState !== 'visible') return;
		if (report.results.length) await invalidateAll();
		if (document.visibilityState !== 'visible') return;
		await showStoredSyncStatus();
	} catch {
		if (document.visibilityState === 'visible') {
			showSyncFailure('Android data could not be synchronized.');
		}
	}
}

async function rescheduleBedtimeReminder() {
	try {
		await rescheduleBedtimeReminderFromApi();
	} catch {
		recordDiagnostic({
			operation: 'reminders',
			category: 'native',
			committed: false,
			retryable: true
		});
	}
}

async function showStoredSyncStatus() {
	try {
		const status = await mobileRepository.loadStatus();
		const enabledTrackers = enabledNativeTrackerIds(
			bootstrapData.enabledTrackers.map(({ id }) => id)
		);
		showSyncStatus(failedTrackerIds(status, enabledTrackers));
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

function dateSelectorColors(pathname: string): TrackerColors[] {
	const trackerColors = getTrackerColorsForPathname(pathname);
	if (trackerColors) return [trackerColors];
	const shopColors = getShopColorsForPathname(pathname);
	return shopColors ? [{ ...shopColors, tertiary: shopColors.secondary }] : [];
}

function markedDates(pageData: DatedPageData) {
	if (pageData.markedDates) return pageData.markedDates;
	if (pageData.completedDays) return pageData.completedDays.map((day) => day.dateKey);
	if (pageData.meditationHistory) return pageData.meditationHistory.map((day) => day.localDate);
	return pageData.trackedDates ?? [];
}

async function retryStartup() {
	if (retryingStartup) return;
	retryingStartup = true;
	try {
		await refreshAppData(APP_RESOURCES.bootstrap);
	} catch {
		recordDiagnostic({
			operation: 'refresh',
			category: 'storage',
			committed: false,
			retryable: true
		});
	} finally {
		retryingStartup = false;
	}
}

function dateHref(pathname: string, date: string, today: string) {
	const target = new URL(page.url);
	if (pathname.startsWith('/nutrition/log/')) {
		target.pathname = `/nutrition/log/${date}`;
		target.searchParams.delete('date');
	} else if (date === today) target.searchParams.delete('date');
	else target.searchParams.set('date', date);
	return `${target.pathname}${target.search}${target.hash}`;
}
</script>

<ModeWatcher defaultMode="system" modeStorageKey="self-improvement-theme" />

{#if startupError}
	<main class="app-gutter flex min-h-svh items-center justify-center py-4 text-center">
		<Card class="w-full max-w-sm">
			<CardHeader>
				<p class="text-sm font-medium text-(--text-muted)">Storage startup</p>
				<CardTitle class="text-xl">Local storage could not start</CardTitle>
			</CardHeader>
			<CardContent class="items-center">
				<p class="text-sm text-(--text)/64">{startupError}</p>
				<Button profile="highlighted" size="medium" disabled={retryingStartup} onclick={retryStartup}>{retryingStartup ? 'Retrying…' : 'Retry'}</Button>
			</CardContent>
		</Card>
	</main>
{:else}
{#key restoreRevision}
<div
	class={appShellActive
		? `safe-area-padding-top flex h-svh flex-col overflow-hidden ${selectedFeature ? 'tracker-theme' : ''} ${selectedTracker ? 'tracker-fade' : ''}`
		: undefined}
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
					onselect={(date: string) => goto(resolve(dateNavigation.hrefForDate(date) as '/'), { noScroll: true, keepFocus: true })}
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
	{#key dateNavigationKey(page.url.pathname, page.url.searchParams.get('date'))}
		<div class={appShellActive ? 'flex min-h-0 flex-1 flex-col overflow-y-auto' : undefined}>
			<div class="contents" use:pageEnter>{@render children()}</div>
		</div>
	{/key}
	{#if appShellActive}
		<BottomActionBarOutlet />
		<AppNavbar
			profile={bootstrapData.profile}
			trackers={bootstrapData.enabledTrackers}
			gamification={bootstrapData.gamification}
			daySummary={(page.data as DatedPageData).actionFeed?.daySummary}
		/>
	{/if}
</div>
<TrackerCompleteOverlay />
<GamificationToast gamification={bootstrapData.gamification} />
{/key}
<Toaster
	position="top-center"
	offset={{ top: 'calc(1rem + var(--app-safe-area-inset-top))' }}
/>
{/if}
