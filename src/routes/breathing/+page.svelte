<script lang="ts">
import { onDestroy, untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import { useDateSelectorState } from '$lib/components/tracker/date-selection-context.svelte';
import { DateBoundRequestLifetime } from '$lib/forms/date-bound-request';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import BreathingExerciseSection from './components/breathingExerciseSection.svelte';
import { type BreathingCompletion, type SaveState } from './breathing';
import type { PageProps } from './$types';

type SavedExercise = BreathingCompletion & {
	technique: '4-7-8' | '4-8';
	durationSeconds: number;
};

let { data }: PageProps = $props();
const dateSelectorState = useDateSelectorState();
let loadedDate = $state(untrack(() => data.date));
const completionRequests = new DateBoundRequestLifetime(untrack(() => data.date));
let savedExercise = $state<SavedExercise>();
let pendingCompletion = $state<BreathingCompletion>();
let saveState = $state<SaveState>('idle');
const exerciseCompleted = $derived(Boolean(data.exercise || savedExercise));
const isToday = $derived(data.date === data.today);
const progressDays = $derived(
	data.progressDays.map((day) =>
		day.date === data.date && exerciseCompleted ? { ...day, value: 1 } : day
	)
);

$effect(() => {
	if (data.date === loadedDate) return;
	loadedDate = data.date;
	completionRequests.syncDate(data.date);
	savedExercise = undefined;
	pendingCompletion = undefined;
	saveState = 'idle';
});

async function saveCompletion(completion: BreathingCompletion) {
	const submittedDate = completion.localDate;
	const request = completionRequests.begin(submittedDate);
	pendingCompletion = completion;
	saveState = 'saving';
	try {
		const saved = await postCompletion(completion);
		if (!completionRequests.isCurrent(request, data.date)) return;
		dateSelectorState.mark(submittedDate, true);
		savedExercise = saved;
		saveState = 'saved';
	} catch {
		if (completionRequests.isCurrent(request, data.date)) saveState = 'error';
	}
}

onDestroy(() => completionRequests.dispose());

async function postCompletion(completion: BreathingCompletion) {
	return apiRequest<SavedExercise>('/api/app/breathing', {
		method: 'POST',
		body: JSON.stringify(completion)
	});
}

function retryCompletion() {
	if (pendingCompletion) void saveCompletion(pendingCompletion);
}
</script>

<svelte:head>
	<title>Breathing · Self Improvement</title>
	<meta
		name="description"
		content="A guided daily 4-7-8 breathing exercise for relaxation and focus."
	/>
</svelte:head>

<TrackerPage
	class="flex max-w-(--app-compact-max-width) flex-col"
	contentClass="flex flex-1 flex-col"
	progress={{
		mode: 'check',
		days: progressDays,
		ariaLabel: 'Five-day breathing progress'
	}}
>
	<BreathingExerciseSection
		localDate={data.date}
		rounds={data.settings.rounds}
		includeHold={data.settings.includeHold}
		{saveState}
		complete={exerciseCompleted}
		interactive={isToday && !exerciseCompleted}
		oncomplete={(completion) => void saveCompletion(completion)}
		onretry={retryCompletion}
	/>
</TrackerPage>
