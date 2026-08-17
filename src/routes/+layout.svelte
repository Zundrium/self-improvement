<script lang="ts">
	import '@fontsource-variable/ibm-plex-sans';
	import './layout.css';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import AppNavbar from '$lib/components/app-navbar.svelte';
	import DateSelector from '$lib/components/date-selector.svelte';
	import { provideDateSelectorState } from '$lib/components/date-selector-state.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
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
		hrefForDate: (date: string) => string;
	};

	let { data, children }: LayoutProps = $props();
	const initialPageData = page.data as DatedPageData;
	const dateSelectorState = provideDateSelectorState(markedDates(initialPageData));
	const dateNavigation = $derived(
		createDateNavigation(page.url.pathname, page.data as DatedPageData)
	);

	$effect(() => {
		const markedDates = dateNavigation?.markedDates ?? [];
		untrack(() => dateSelectorState.replace(markedDates));
	});

	function createDateNavigation(
		pathname: string,
		pageData: DatedPageData
	): DateNavigation | undefined {
		const datedData = pathname === '/' ? pageData.dashboard : pageData;
		const date = datedData?.date;
		const today = datedData?.today;
		if (!date || !today) return;
		return {
			date,
			today,
			markedDates: markedDates(pageData),
			hrefForDate: (selectedDate) => dateHref(pathname, selectedDate, today)
		};
	}

	function markedDates(pageData: DatedPageData) {
		if (pageData.markedDates) return pageData.markedDates;
		if (pageData.completedDays) return pageData.completedDays.map((day) => day.dateKey);
		if (pageData.meditationHistory) {
			return pageData.meditationHistory.map((day) => day.localDate);
		}
		return pageData.trackedDates ?? [];
	}

	function dateHref(pathname: string, date: string, today: string) {
		if (pathname.startsWith('/nutrition/log/')) return `/nutrition/log/${date}`;
		if (date === today) return pathname;
		return pathname === '/' ? `/?date=${date}` : `${pathname}?date=${date}`;
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class={dateNavigation ? 'flex h-svh flex-col overflow-hidden' : undefined}>
	{#if dateNavigation}
		<div class="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
			<DateSelector
				date={dateNavigation.date}
				today={dateNavigation.today}
				markedDates={[...dateSelectorState.markedDates]}
				hrefForDate={dateNavigation.hrefForDate}
			/>
		</div>
	{/if}
	<div class={dateNavigation ? 'flex min-h-0 flex-1 flex-col overflow-y-auto' : undefined}>
		{@render children()}
	</div>
	{#if data.user}
		<AppNavbar user={data.user} trackers={data.enabledTrackers} />
	{/if}
</div>
<Toaster
	position="bottom-center"
	richColors
	offset={data.user ? { bottom: 'calc(5rem + env(safe-area-inset-bottom))' } : undefined}
/>
