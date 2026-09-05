<script lang="ts">
import { onDestroy, untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import { AudioManager } from '$lib/audio/audio-manager';
import { useDateSelectorState } from '$lib/components/tracker/date-selection-context.svelte';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import AmbientSounds from './components/ambientSounds.svelte';
import MeditationTimer from './components/meditationTimer.svelte';
import { type MeditationCompletion, type SaveState } from './meditation';
import { meditationEnter } from './meditationMotion';
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
const completed = $derived(
	data.progressDays.find(({ date }) => date === data.date)?.value === 1 ||
		Boolean(savedCompletions.length)
);
const progressDays = $derived(
	data.progressDays.map((day) => (day.date === data.date && completed ? { ...day, value: 1 } : day))
);

$effect(() => {
	if (data.date === loadedDate) return;
	loadedDate = data.date;
	savedCompletions = [];
	pendingCompletion = undefined;
	saveState = 'idle';
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

<TrackerPage
	class="max-w-(--app-compact-max-width)"
	contentClass="space-y-1"
	progress={{
		mode: 'check',
		days: progressDays,
		ariaLabel: 'Five-day meditation progress'
	}}
>
	{#if isToday}
		<div class="space-y-1" data-motion-page-enter="custom" use:meditationEnter>
			<MeditationTimer
				{audioManager}
				initialDurationSeconds={data.initialDurationSeconds}
				{saveState}
				oncomplete={(completion) => void saveCompletion(completion)}
				onretry={retryCompletion}
			/>
			<AmbientSounds {audioManager} />
		</div>
	{/if}
</TrackerPage>
