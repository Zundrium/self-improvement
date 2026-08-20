<script lang="ts">
	import '@fontsource-variable/ibm-plex-sans';
	import './layout.css';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { audioVolumeState } from '$lib/audio/audio-volume.svelte';
	import AppNavbar from '$lib/components/appNavbar.svelte';
	import BottomActionBarOutlet from '$lib/components/bottomActionBarOutlet.svelte';
	import { provideBottomActionBarState } from '$lib/components/bottomActionBarState.svelte';
	import DateSelector from '$lib/components/dateSelector.svelte';
	import { provideDateSelectorState } from '$lib/components/dateSelectorState.svelte';
	import TrackerTitle from '$lib/components/trackerTitle.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import {
		getTrackerColorsForPathname,
		getTrackerForPathname,
		type TrackerColors
	} from '$lib/trackers/registry';
	import { SyncCoordinator } from '$domain/sync-coordinator';
	import { getLaunchUrl, listenForAppUrls, listenForResume } from '$native/app';
	import { createNativeTrackerJobs } from '$native/jobs';
	import { isNativeAndroid } from '$native/platform';
	import { mobileRepository } from '$lib/api';
	import type { LayoutProps } from './$types';

	type DatedPageData = {
		date?: string;
		today?: string;
		markedDates?: string[];
		completedDays?: Array<{ dateKey: string }>;
		meditationHistory?: Array<{ localDate: string }>;
		trackedDates?: string[];
		dashboard?: { date: string; today: string };
	};
	type DateNavigation = {
		date: string;
		today: string;
		markedDates: string[];
		colors: TrackerColors[];
		hrefForDate: (date: string) => string;
	};

	let { data, children }: LayoutProps = $props();
	const initialPageData = page.data as DatedPageData;
	const dateSelectorState = provideDateSelectorState(markedDates(initialPageData));
	provideBottomActionBarState();
	const dateNavigation = $derived(
		createDateNavigation(page.url.pathname, page.data as DatedPageData)
	);
	const selectedTracker = $derived(getTrackerForPathname(page.url.pathname));
	const appShellActive = $derived(Boolean(data.user) && page.url.pathname !== '/nutrition/track');

	$effect(() => {
		const dates = dateNavigation?.markedDates ?? [];
		untrack(() => dateSelectorState.replace(dates));
	});

	onMount(() => {
		audioVolumeState.hydrate();
		if (!isNativeAndroid()) return;
		const coordinator = new SyncCoordinator(mobileRepository, createNativeTrackerJobs());
		if (data.user) void coordinator.syncStale();
		let removeResume = () => {};
		let removeUrls = () => {};
		void listenForResume(async () => {
			if (data.user) await coordinator.syncStale();
		}).then((remove) => (removeResume = remove));
		void getLaunchUrl().then((url) => url && openAppUrl(url));
		void listenForAppUrls(openAppUrl).then((remove) => (removeUrls = remove));
		return () => {
			removeResume();
			removeUrls();
		};
	});

	function createDateNavigation(
		pathname: string,
		pageData: DatedPageData
	): DateNavigation | undefined {
		const datedData = pathname === '/' ? pageData.dashboard : pageData;
		if (!datedData?.date || !datedData.today) return;
		return {
			date: datedData.date,
			today: datedData.today,
			markedDates: markedDates(pageData),
			colors: dateSelectorColors(pathname),
			hrefForDate: (selectedDate) => dateHref(pathname, selectedDate, datedData.today as string)
		};
	}

	function dateSelectorColors(pathname: string) {
		const colors = getTrackerColorsForPathname(pathname);
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
		return pathname === '/' ? `/?date=${date}` : `${pathname}?date=${date}`;
	}

	function openAppUrl(url: URL) {
		if (url.protocol !== 'selfimprovement:' || url.host !== 'reset-password') return;
		void goto(resolve(`/reset-password${url.search}` as '/reset-password'));
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class={appShellActive ? 'safe-area-padding-y flex h-svh flex-col overflow-hidden' : undefined}>
	{#if dateNavigation}
		<div class="app-gutter shrink-0 py-(--app-header-padding-block)">
			<DateSelector
				date={dateNavigation.date}
				today={dateNavigation.today}
				markedDates={[...dateSelectorState.markedDates]}
				colors={dateNavigation.colors}
				hrefForDate={dateNavigation.hrefForDate}
			/>
			{#if selectedTracker}
				<TrackerTitle tracker={selectedTracker} class="mt-2" />
			{/if}
		</div>
	{/if}
	<div class={appShellActive ? 'flex min-h-0 flex-1 flex-col overflow-y-auto' : undefined}>
		{@render children()}
	</div>
	{#if data.user && appShellActive}
		<BottomActionBarOutlet />
		<AppNavbar user={data.user} trackers={data.enabledTrackers} />
	{/if}
</div>
<Toaster
	position="bottom-center"
	richColors
	offset={appShellActive ? { bottom: 'calc(5rem + env(safe-area-inset-bottom))' } : undefined}
/>
