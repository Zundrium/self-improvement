<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { AudioManager } from '$lib/audio/audio-manager';
	import { useDateSelectorState } from '$lib/components/dateSelectorState.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import AmbientSounds from './components/ambientSounds.svelte';
	import MeditationTimer from './components/meditationTimer.svelte';
	import { type MeditationCompletion, type SaveState } from './meditation';
	import { ambientSounds } from './sounds';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const dateSelectorState = useDateSelectorState();
	let audioManager = $state<AudioManager>();
	let loadedDate = $state(untrack(() => data.date));
	let savedCompletions = $state<MeditationCompletion[]>([]);
	let pendingCompletion = $state<MeditationCompletion>();
	let saveState = $state<SaveState>('idle');

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
		return apiRequest<MeditationCompletion>('/api/app/meditation', {
			method: 'POST',
			body: JSON.stringify(completion)
		});
	}

	function recordCompletion(completion: MeditationCompletion) {
		if (savedCompletions.some((saved) => saved.id === completion.id)) return;
		savedCompletions = [...savedCompletions, completion];
		dateSelectorState.mark(completion.localDate, true);
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

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-1">
	{#if isToday}
		<MeditationTimer
			{audioManager}
			{saveState}
			oncomplete={(completion) => void saveCompletion(completion)}
			onretry={retryCompletion}
		/>
		<AmbientSounds {audioManager} />
	{/if}
</TrackerPage>
