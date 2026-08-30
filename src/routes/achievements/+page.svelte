<script lang="ts">
	import { CircleCheck, LockKeyhole } from '@lucide/svelte';
	import type { AchievementCategory, AchievementSummary } from '$lib/api-types';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { achievementIcon } from '$lib/local/achievement-icons';
	import { getTrackerColors, trackers } from '$lib/trackers/registry';
	import type { PageProps } from './$types';

	type AchievementFilter = 'all' | 'unlocked' | 'progress';
	type AchievementSection = {
		title: string;
		description: string;
		categories: AchievementCategory[];
	};

	let { data }: PageProps = $props();
	let filter = $state<AchievementFilter>('all');
	const colors = getTrackerColors('achievements');
	const filters = [
		{ id: 'all', label: 'All' },
		{ id: 'unlocked', label: 'Unlocked' },
		{ id: 'progress', label: 'In progress' }
	] as const;
	const sectionDefinitions: AchievementSection[] = [
		{
			title: 'Overall',
			description: 'Glimmers, streaks, variety, and perfect days.',
			categories: ['overall', 'score', 'streak']
		},
		{
			title: 'Tracker milestones',
			description: 'Six milestones for every tracker.',
			categories: ['tracker-milestone']
		},
		{
			title: 'Tracker specials',
			description: 'Distinct challenges inside each tracker.',
			categories: ['tracker-special']
		},
		{
			title: 'Combinations',
			description: 'Healthy actions that work especially well together.',
			categories: ['combination']
		},
		{
			title: 'Setup and connections',
			description: 'Make the app yours and connect its tools.',
			categories: ['event']
		}
	];
	const filteredAchievements = $derived(data.achievements.filter(matchesFilter));
	const sections = $derived(
		sectionDefinitions
			.map((section) => ({
				...section,
				achievements: filteredAchievements.filter((achievement) =>
					section.categories.includes(achievement.category)
				)
			}))
			.filter(({ achievements }) => achievements.length)
	);

	function matchesFilter(achievement: AchievementSummary) {
		if (filter === 'unlocked') return achievement.unlocked;
		if (filter === 'progress') return !achievement.unlocked;
		return true;
	}

	function achievementColor(achievement: AchievementSummary) {
		return getTrackerColors(achievement.trackerId ?? 'achievements').primary;
	}

	function trackerLabel(achievement: AchievementSummary) {
		if (!achievement.trackerId) return '';
		return trackers.find(({ id }) => id === achievement.trackerId)?.label ?? '';
	}

	function progressLabel(achievement: AchievementSummary) {
		const progress = Math.min(achievement.progress, achievement.target);
		if (achievement.id === 'steps-double-goal') return `${progress.toFixed(1)}× / 2×`;
		if (achievement.target >= 600 && achievement.id.includes('meditation')) {
			return `${Math.floor(progress / 60).toLocaleString()} / ${(achievement.target / 60).toLocaleString()} min`;
		}
		if (achievement.id === 'breathing-one-hour-total') {
			return `${Math.floor(progress / 60).toLocaleString()} / 60 min`;
		}
		return `${formatNumber(progress)} / ${formatNumber(achievement.target)}`;
	}

	function formatNumber(value: number) {
		return (Number.isInteger(value) ? value : Math.round(value * 10) / 10).toLocaleString();
	}
</script>

<svelte:head>
	<title>Achievements · Self Improvement</title>
	<meta name="description" content="View unlocked achievements and personal progress." />
</svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-10">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<p class="text-sm text-(--text)/56">
			<strong class="font-medium text-(--text)">{data.achievementCount}</strong> of
			{data.achievementTotal} unlocked
		</p>
		<div class="flex gap-1 rounded-full bg-(--text)/5 p-1" aria-label="Achievement filters">
			{#each filters as option (option.id)}
				<Button
					variant={filter === option.id ? 'default' : 'ghost'}
					size="small"
					aria-pressed={filter === option.id}
					onclick={() => (filter = option.id)}
				>
					{option.label}
				</Button>
			{/each}
		</div>
	</div>

	{#each sections as section (section.title)}
		<TrackerSection
			title={section.title}
			description={section.description}
			{colors}
			contentClass="space-y-6"
		>
			{#each section.achievements as achievement (achievement.id)}
				{@const AchievementIcon = achievementIcon(achievement.icon)}
				{@const color = achievementColor(achievement)}
				<div class="flex items-start gap-4">
					<span
						class="flex size-11 shrink-0 items-center justify-center rounded-2xl"
						style={`color: ${color}; background: color-mix(in srgb, ${color} 12%, transparent)`}
						aria-hidden="true"
					>
						<AchievementIcon class="size-6" />
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h3 class="text-sm font-medium">{achievement.title}</h3>
								{#if trackerLabel(achievement)}
									<p class="mt-0.5 text-xs text-(--text)/44">{trackerLabel(achievement)}</p>
								{/if}
							</div>
							<span
								class={`flex shrink-0 items-center gap-1.5 text-xs tabular-nums ${achievement.unlocked ? 'text-(--text)' : 'text-(--text)/48'}`}
							>
								{#if achievement.unlocked}
									<CircleCheck class="size-3.5" style={`color: ${color}`} /> Unlocked
								{:else}
									<LockKeyhole class="size-3.5" /> {progressLabel(achievement)}
								{/if}
							</span>
						</div>
						<p class="mt-1 text-sm leading-5 text-(--text)/56">{achievement.description}</p>
						{#if !achievement.unlocked}
							<Progress
								class="mt-3 h-1.5"
								value={Math.min(achievement.progress, achievement.target)}
								max={achievement.target}
								indicatorStyle={`background: ${color}`}
							/>
						{/if}
					</div>
				</div>
			{/each}
		</TrackerSection>
	{/each}

	{#if !sections.length}
		<p class="py-10 text-center text-sm text-(--text)/56">No achievements match this filter.</p>
	{/if}
</TrackerPage>
