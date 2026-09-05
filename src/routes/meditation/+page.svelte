<script lang="ts">
import { onDestroy, untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import { AudioManager } from '$lib/audio/audio-manager';
import { useDateSelectorState } from '$lib/components/tracker/date-selection-context.svelte';
import { DateBoundRequestLifetime } from '$lib/forms/date-bound-request';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import MeditationPracticeSection from './components/meditationPracticeSection.svelte';
import { type MeditationCompletion, type SaveState } from './meditation';
import { ambientSounds } from './sounds';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
const dateSelectorState = useDateSelectorState();
let audioManager = $state<AudioManager>();
let loadedDate = $state(untrack(() => data.date));
const completionRequests = new DateBoundRequestLifetime(untrack(() => data.date));
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
	completionRequests.syncDate(data.date);
	savedCompletions = [];
	pendingCompletion = undefined;
	saveState = 'idle';
});

$effect(() => {
	if (isToday && !audioManager) audioManager = createAudioManager();
	if (!isToday && audioManager) destroyAudioManager();
});

onDestroy(() => {
	completionRequests.dispose();
	audioManager?.destroy();
});

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
	const submittedDate = completion.localDate;
	const request = completionRequests.begin(submittedDate);
	pendingCompletion = completion;
	saveState = 'saving';
	try {
		const saved = await postCompletion(completion);
		if (!completionRequests.isCurrent(request, data.date)) return;
		dateSelectorState.mark(submittedDate, true);
		recordCompletion(saved);
		saveState = 'saved';
	} catch {
		if (completionRequests.isCurrent(request, data.date)) saveState = 'error';
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
		<MeditationPracticeSection
			{audioManager}
			initialDurationSeconds={data.initialDurationSeconds}
			{saveState}
			oncomplete={(completion) => void saveCompletion(completion)}
			onretry={retryCompletion}
		/>
	{/if}
</TrackerPage>
