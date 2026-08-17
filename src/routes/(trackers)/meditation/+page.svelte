<script lang="ts">
	import { resolve } from '$app/paths';
	import { Check } from '@lucide/svelte';
	import { onDestroy, untrack } from 'svelte';
	import { AudioManager } from '$lib/audio/audio-manager';
	import DateSelector from '$lib/components/date-selector.svelte';
	import AmbientSounds from './AmbientSounds.svelte';
	import MeditationTimer from './MeditationTimer.svelte';
	import { formatDuration, type MeditationCompletion, type SaveState } from './meditation';
	import { ambientSounds } from './sounds';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let audioManager = $state<AudioManager>();
	let loadedDate = $state(untrack(() => data.date));
	let savedCompletions = $state<MeditationCompletion[]>([]);
	let pendingCompletion = $state<MeditationCompletion>();
	let saveState = $state<SaveState>('idle');

	const meditationHistory = $derived(
		mergeMeditationHistory(data.meditationHistory, savedCompletions)
	);
	const selectedDay = $derived(
		meditationHistory.find((summary) => summary.localDate === data.date)
	);
	const isToday = $derived(data.date === data.today);

	$effect(() => {
		if (data.date === loadedDate) return;
		loadedDate = data.date;
		savedCompletions = [];
	});

	$effect(() => {
		if (isToday && !audioManager) audioManager = createAudioManager();
		if (!isToday && audioManager) destroyAudioManager();
	});

	onDestroy(() => audioManager?.destroy());

	function createAudioManager() {
		const manager = new AudioManager();
		for (const sound of ambientSounds) manager.addLoop(sound.id, sound.url);
		return manager;
	}

	function destroyAudioManager() {
		audioManager?.destroy();
		audioManager = undefined;
	}

	function meditationHref(date: string) {
		return date === data.today ? '/meditation' : `/meditation?date=${date}`;
	}

	async function saveCompletion(completion: MeditationCompletion) {
		pendingCompletion = completion;
		saveState = 'saving';
		try {
			recordCompletion(await postCompletion(completion));
			saveState = 'saved';
		} catch {
			saveState = 'error';
		}
	}

	async function postCompletion(completion: MeditationCompletion) {
		const response = await fetch(resolve('/meditation'), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(completion)
		});
		if (!response.ok) throw new Error('Could not save meditation session');
		return (await response.json()) as MeditationCompletion;
	}

	function recordCompletion(completion: MeditationCompletion) {
		if (savedCompletions.some((saved) => saved.id === completion.id)) return;
		savedCompletions = [...savedCompletions, completion];
	}

	function mergeMeditationHistory(
		history: Array<{ localDate: string; totalSeconds: number; sessionCount: number }>,
		completions: MeditationCompletion[]
	) {
		const merged = history.map((day) => ({ ...day }));
		for (const completion of completions) addCompletion(merged, completion);
		return merged.sort((first, second) => second.localDate.localeCompare(first.localDate));
	}

	function addCompletion(
		history: Array<{ localDate: string; totalSeconds: number; sessionCount: number }>,
		completion: MeditationCompletion
	) {
		const summary = history.find((day) => day.localDate === completion.localDate);
		if (summary) updateSummary(summary, completion.durationSeconds);
		else history.push(newSummary(completion));
	}

	function updateSummary(
		summary: { totalSeconds: number; sessionCount: number },
		durationSeconds: number
	) {
		summary.totalSeconds += durationSeconds;
		summary.sessionCount += 1;
	}

	function newSummary(completion: MeditationCompletion) {
		return {
			localDate: completion.localDate,
			totalSeconds: completion.durationSeconds,
			sessionCount: 1
		};
	}

	function retryCompletion() {
		if (pendingCompletion) void saveCompletion(pendingCompletion);
	}
</script>

<svelte:head>
	<title>Meditate · Self Improvement</title>
	<meta
		name="description"
		content="A simple meditation timer with mixable looping ambient sounds."
	/>
</svelte:head>

<main class="min-h-[calc(100svh-4rem)] px-4 py-6 pb-28 sm:px-6 sm:py-10">
	<section class="mx-auto w-full max-w-md space-y-6">
		<DateSelector
			date={data.date}
			today={data.today}
			markedDates={meditationHistory.map((day) => day.localDate)}
			hrefForDate={meditationHref}
		/>

		{#if isToday}
			<MeditationTimer
				{audioManager}
				{saveState}
				oncomplete={(completion) => void saveCompletion(completion)}
				onretry={retryCompletion}
			/>
			<AmbientSounds {audioManager} />
		{/if}

		<section
			class="flex items-center gap-4 border-t border-(--text)/8 py-5"
			aria-label="Daily meditation"
		>
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-3xl {selectedDay
					? 'bg-(--text) text-(--bg)'
					: 'border border-(--text)/20'}"
			>
				{#if selectedDay}<Check class="size-5" />{/if}
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium">
					{selectedDay ? 'Meditated' : isToday ? 'No meditation yet' : 'No meditation recorded'}
				</p>
				<p class="mt-0.5 text-xs text-(--text)/48">
					{#if selectedDay}
						{selectedDay.sessionCount}
						{selectedDay.sessionCount === 1 ? 'session' : 'sessions'}
					{:else if isToday}
						Complete a session to mark today.
					{:else}
						No completed sessions on this day.
					{/if}
				</p>
			</div>
			{#if selectedDay}
				<p class="text-sm font-medium tabular-nums">{formatDuration(selectedDay.totalSeconds)}</p>
			{/if}
		</section>
	</section>
</main>
