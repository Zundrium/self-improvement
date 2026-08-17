<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import AmbientSounds from './AmbientSounds.svelte';
	import { AmbientAudioManager } from './audio-manager';
	import MeditationTimer from './MeditationTimer.svelte';
	import {
		formatDuration,
		getLocalDate,
		type MeditationCompletion,
		type SaveState
	} from './meditation';
	import { ambientSounds } from './sounds';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let audioManager = $state<AmbientAudioManager>();
	let localDate = $state('');
	let savedCompletions = $state<MeditationCompletion[]>([]);
	let pendingCompletion = $state<MeditationCompletion>();
	let saveState = $state<SaveState>('idle');

	const meditationHistory = $derived(
		mergeMeditationHistory(data.meditationHistory, savedCompletions)
	);

	onMount(() => {
		localDate = getLocalDate();
		audioManager = createAudioManager();
		return () => audioManager?.destroy();
	});

	function createAudioManager() {
		const manager = new AmbientAudioManager();
		for (const sound of ambientSounds) manager.addSound(sound.id, sound.url);
		return manager;
	}

	async function saveCompletion(completion: MeditationCompletion) {
		localDate = completion.localDate;
		pendingCompletion = completion;
		saveState = 'saving';
		try {
			const savedCompletion = await postCompletion(completion);
			recordCompletion(savedCompletion);
			saveState = 'saved';
		} catch {
			saveState = 'error';
		}
	}

	async function postCompletion(completion: MeditationCompletion) {
		const response = await fetch(resolve('/meditate'), {
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
		if (summary) {
			summary.totalSeconds += completion.durationSeconds;
			summary.sessionCount += 1;
		} else {
			history.push({
				localDate: completion.localDate,
				totalSeconds: completion.durationSeconds,
				sessionCount: 1
			});
		}
	}

	function retryCompletion() {
		if (pendingCompletion) void saveCompletion(pendingCompletion);
	}

	function formatHistoryDate(date: string) {
		if (date === localDate) return 'Today';
		return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Meditate · Self Improvement</title>
	<meta
		name="description"
		content="A simple meditation timer with mixable looping ambient sounds."
	/>
</svelte:head>

<main class="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-6 sm:py-10">
	<section class="mx-auto w-full max-w-md">
		<MeditationTimer
			{audioManager}
			{saveState}
			oncomplete={(completion) => void saveCompletion(completion)}
			onretry={retryCompletion}
		/>

		<AmbientSounds {audioManager} />

		{#if meditationHistory.length}
			<section aria-label="Meditation history">
				{#each meditationHistory.slice(0, 7) as day, index (day.localDate)}
					<div
						class="flex items-center justify-between gap-4 py-3 {index
							? 'border-t border-(--text)/8'
							: ''}"
					>
						<div>
							<p class="text-sm font-medium">{formatHistoryDate(day.localDate)}</p>
							<p class="text-xs text-(--text)/48">
								{day.sessionCount}
								{day.sessionCount === 1 ? 'session' : 'sessions'}
							</p>
						</div>
						<p class="text-sm font-medium tabular-nums">{formatDuration(day.totalSeconds)}</p>
					</div>
				{/each}
			</section>
		{/if}
	</section>
</main>
