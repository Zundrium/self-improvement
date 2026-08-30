<script lang="ts">
	import { navigating, page } from '$app/state';
	import { trackerIcons } from '$lib/trackers/icons';
	import { getTrackerColors, type AppTracker, type AppTrackerId } from '$lib/trackers/registry';
	import type { DaySummaryData } from '$lib/api-types';
	import { Button } from '$lib/components/ui/button';
	import { staggerChildren } from '$lib/motion/gsap';
	import { formatScreenTime } from '../../routes/screen-time/screen-time';
	import { formatBedtime, formatUsageSeconds } from '../../routes/sleep/sleep';
	import TrackerTile from './trackerTile.svelte';

	type TrackerState = 'complete' | 'attention' | 'incomplete';
	type TrackerDetails = { value: string; state: TrackerState; href: string };
	type Props = {
		trackers: AppTracker[];
		daySummary: DaySummaryData;
		onSelect?: () => void;
	};

	let { trackers, daySummary, onSelect }: Props = $props();
	const stepsDone = $derived(daySummary.steps >= daySummary.stepGoal);
	const sleepDone = $derived(daySummary.sleepStatus === 'pass');
	const sleepValue = $derived(
		daySummary.sleepSetupRequired
			? 'Choose apps'
			: daySummary.sleepStatus === 'fail'
				? `${formatUsageSeconds(daySummary.sleepLateUsageSeconds)} late`
				: daySummary.sleepStatus === 'pass'
					? 'On time'
					: `${formatBedtime(daySummary.sleepBedtime)} bedtime`
	);
	const caloriesDone = $derived(
		daySummary.nutritionFasting ||
			(daySummary.calorieGoal !== null &&
				daySummary.calories > 0 &&
				daySummary.calories <= daySummary.calorieGoal)
	);
	const trackerDetails = $derived({
		steps: trackerDetail(`${daySummary.steps.toLocaleString()} steps`, stepsDone, '/steps'),
		sleep: trackerDetail(
			sleepValue,
			sleepDone,
			'/sleep',
			daySummary.sleepSetupRequired || daySummary.sleepStatus === 'fail'
		),
		'screen-time': trackerDetail(
			daySummary.screenTimeRecorded ? formatScreenTime(daySummary.screenTimeMinutes) : 'Not synced',
			daySummary.screenTimeRecorded &&
				daySummary.screenTimeMinutes <= daySummary.screenTimeLimitMinutes,
			'/screen-time',
			true
		),
		fitness: trackerDetail(
			daySummary.fitnessWorkoutTitle,
			daySummary.fitnessDone || daySummary.fitnessWorkoutTitle === 'Rest day',
			'/fitness',
			daySummary.fitnessWorkoutTitle !== 'Rest day'
		),
		nutrition: {
			value: daySummary.nutritionFasting
				? 'Fasting'
				: `${daySummary.calories.toLocaleString()} kcal`,
			state: trackerState(caloriesDone),
			href: `/nutrition/log/${daySummary.date}`
		},
		meditation: trackerDetail(
			daySummary.meditationDone ? 'Completed' : 'Not yet',
			daySummary.meditationDone,
			'/meditation',
			true
		),
		breathing: trackerDetail(
			daySummary.breathingDone ? 'Completed' : 'Not yet',
			daySummary.breathingDone,
			'/breathing',
			true
		),
		stretch: trackerDetail(
			daySummary.stretchScheduled
				? daySummary.stretchDone
					? 'Completed'
					: 'Not yet'
				: 'Rest day',
			daySummary.stretchDone || !daySummary.stretchScheduled,
			'/stretch',
			daySummary.stretchScheduled
		),
		happiness: trackerDetail(
			daySummary.happinessRating ? `${daySummary.happinessRating}/5` : 'Not logged',
			daySummary.happinessRating !== null,
			'/happiness',
			true
		),
		period: trackerDetail(
			daySummary.periodFlow ? `${capitalize(daySummary.periodFlow)} flow` : 'Not logged',
			daySummary.periodFlow !== null,
			'/period'
		)
	} satisfies Record<AppTrackerId, TrackerDetails>);
	const drawerTrackers = $derived(
		trackers.map((tracker) => ({
			...tracker,
			...trackerDetails[tracker.id],
			icon: trackerIcons[tracker.id],
			colors: getTrackerColors(tracker.id)
		}))
	);

	function trackerDetail(
		value: string,
		complete: boolean,
		path: string,
		needsAttention = false
	): TrackerDetails {
		return { value, state: trackerState(complete, needsAttention), href: datedHref(path) };
	}

	function trackerState(complete: boolean, needsAttention = false): TrackerState {
		if (complete) return 'complete';
		return needsAttention && daySummary.date === daySummary.today ? 'attention' : 'incomplete';
	}

	function datedHref(path: string) {
		return daySummary.date === daySummary.today ? path : `${path}?date=${daySummary.date}`;
	}

	function matchesPath(pathname: string, activePrefix: string) {
		return pathname.startsWith(activePrefix);
	}

	function isActive(activePrefix: string) {
		return matchesPath(page.url.pathname, activePrefix);
	}

	function isPending(activePrefix: string) {
		return Boolean(navigating.to && matchesPath(navigating.to.url.pathname, activePrefix));
	}

	function capitalize(value: string) {
		return `${value[0].toUpperCase()}${value.slice(1)}`;
	}
</script>

<div class="app-gutter py-(--app-overlay-padding)">
	<div class="mx-auto w-full max-w-(--app-compact-max-width)">
		{#if drawerTrackers.length}
			<section
				class="grid grid-cols-3 gap-3"
				aria-label="Tracker apps"
				use:staggerChildren={{ delay: 0.08, y: 18 }}
			>
				{#each drawerTrackers as tracker (tracker.id)}
					<TrackerTile
						href={tracker.href}
						label={tracker.label}
						description={tracker.value}
						state={tracker.state}
						icon={tracker.icon}
						colors={tracker.colors}
						active={isActive(`/${tracker.id}`)}
						pending={isPending(`/${tracker.id}`)}
						{onSelect}
					/>
				{/each}
			</section>
		{:else}
			<section class="space-y-4 py-8 text-center">
				<h2 class="text-xl font-medium">No trackers selected</h2>
				<p class="text-sm text-(--text)/56">Choose the trackers you want to use in your profile.</p>
				<Button size="medium" href="/profile" onclick={onSelect}>Choose trackers</Button>
			</section>
		{/if}
	</div>
</div>
