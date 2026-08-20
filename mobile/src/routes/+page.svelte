<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { trackerIcons } from '$lib/trackers/icons';
	import type { TrackerId } from '$lib/trackers/registry';
	import TrackerTile from '$lib/components/trackerTile.svelte';
	import { formatScreenTime } from './screen-time/screen-time';
	import { formatSleepMinutes } from './sleep/sleep';
	import type { PageProps } from './$types';

	type TrackerDetails = { value: string; complete: boolean; href: string };

	let { data }: PageProps = $props();
	const stepsDone = $derived(data.dashboard.steps >= data.dashboard.stepGoal);
	const sleepDone = $derived(data.dashboard.sleepMinutes >= data.dashboard.sleepGoalMinutes);
	const caloriesDone = $derived(
		data.dashboard.calories > 0 &&
			data.dashboard.calorieGoal !== null &&
			data.dashboard.calories <= data.dashboard.calorieGoal
	);
	const trackerDetails = $derived({
		steps: trackerDetail(`${data.dashboard.steps.toLocaleString()} steps`, stepsDone, '/steps'),
		sleep: trackerDetail(formatSleepMinutes(data.dashboard.sleepMinutes), sleepDone, '/sleep'),
		'screen-time': trackerDetail(
			formatScreenTime(data.dashboard.screenTimeMinutes),
			data.dashboard.screenTimeMinutes > 0,
			'/screen-time'
		),
		fitness: trackerDetail(
			data.dashboard.fitnessWorkoutTitle,
			data.dashboard.fitnessDone,
			'/fitness'
		),
		nutrition: {
			value: `${data.dashboard.calories.toLocaleString()} kcal`,
			complete: caloriesDone,
			href: `/nutrition/log/${data.dashboard.date}`
		},
		meditation: trackerDetail(
			data.dashboard.meditationDone ? 'Completed' : 'Not yet',
			data.dashboard.meditationDone,
			'/meditation'
		),
		breathing: trackerDetail(
			data.dashboard.breathingDone ? 'Completed' : 'Not yet',
			data.dashboard.breathingDone,
			'/breathing'
		),
		happiness: trackerDetail(
			data.dashboard.happinessRating ? `${data.dashboard.happinessRating}/5` : 'Not logged',
			data.dashboard.happinessRating !== null,
			'/happiness'
		),
		period: trackerDetail(
			data.dashboard.periodFlow ? `${capitalize(data.dashboard.periodFlow)} flow` : 'Not logged',
			data.dashboard.periodFlow !== null,
			'/period'
		)
	} satisfies Record<TrackerId, TrackerDetails>);
	const dashboardTrackers = $derived(
		data.enabledTrackers.map((tracker) => ({
			...tracker,
			...trackerDetails[tracker.id],
			icon: trackerIcons[tracker.id]
		}))
	);

	function trackerDetail(value: string, complete: boolean, path: string): TrackerDetails {
		return { value, complete, href: datedFeatureHref(path) };
	}

	function datedFeatureHref(path: string) {
		return data.dashboard.date === data.dashboard.today
			? path
			: `${path}?date=${data.dashboard.date}`;
	}

	function capitalize(value: string) {
		return `${value[0].toUpperCase()}${value.slice(1)}`;
	}
</script>

<svelte:head>
	<title>Self Improvement</title>
	<meta
		name="description"
		content="A unified daily view for health, wellbeing, fitness, and screen-time tracking."
	/>
</svelte:head>

<main class="flex flex-1 items-start justify-center px-4 pt-6 pb-4 sm:px-6 sm:pb-6">
	<div class="w-full max-w-md">
		{#if dashboardTrackers.length}
			<section class="grid grid-cols-3 gap-3" aria-label="Daily dashboard">
				{#each dashboardTrackers as tracker (tracker.id)}
					<TrackerTile
						href={tracker.href}
						label={tracker.label}
						description={tracker.value}
						complete={tracker.complete}
						icon={tracker.icon}
					/>
				{/each}
			</section>
		{:else}
			<section class="space-y-4 py-12 text-center">
				<h1 class="text-xl font-medium">No trackers selected</h1>
				<p class="text-sm text-(--text)/56">Choose the trackers you want to see in your profile.</p>
				<Button href="/profile">Choose trackers</Button>
			</section>
		{/if}
	</div>
</main>
