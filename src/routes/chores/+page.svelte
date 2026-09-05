<script lang="ts">
import { onDestroy, untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import type { ChoresSession } from '$lib/api-types';
import { useDateSelectorState } from '$lib/components/tracker/date-selection-context.svelte';
import { DateBoundRequestLifetime } from '$lib/forms/date-bound-request';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import ChoresTimerSection from './components/choresTimerSection.svelte';
import type { ChoresCompletion, SaveState } from './chores';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
const dateSelectorState = useDateSelectorState();
let loadedDate = $state(untrack(() => data.date));
const completionRequests = new DateBoundRequestLifetime(untrack(() => data.date));
let savedSession = $state<ChoresSession>();
let pendingCompletion = $state<ChoresCompletion>();
let saveState = $state<SaveState>('idle');

const isToday = $derived(data.date === data.today);
const completed = $derived(Boolean(data.session || savedSession));
const progressDays = $derived(
	data.progressDays.map((day) => (day.date === data.date && completed ? { ...day, value: 1 } : day))
);

$effect(() => {
	if (data.date === loadedDate) return;
	loadedDate = data.date;
	completionRequests.syncDate(data.date);
	savedSession = undefined;
	pendingCompletion = undefined;
	saveState = 'idle';
});

async function saveCompletion(completion: ChoresCompletion) {
	const submittedDate = completion.localDate;
	const request = completionRequests.begin(submittedDate);
	pendingCompletion = completion;
	saveState = 'saving';
	try {
		const saved = await postCompletion(completion);
		if (!completionRequests.isCurrent(request, data.date)) return;
		dateSelectorState.mark(submittedDate, true);
		savedSession = saved;
		saveState = 'saved';
	} catch {
		if (completionRequests.isCurrent(request, data.date)) saveState = 'error';
	}
}

onDestroy(() => completionRequests.dispose());

function postCompletion(completion: ChoresCompletion) {
	return apiRequest<ChoresSession>('/api/app/chores', {
		method: 'POST',
		body: JSON.stringify(completion)
	});
}

function retryCompletion() {
	if (pendingCompletion) void saveCompletion(pendingCompletion);
}
</script>

<svelte:head>
	<title>Chores · Self Improvement</title>
	<meta name="description" content="A simple daily 10-minute timer for any quick chore." />
</svelte:head>

<TrackerPage
	class="flex max-w-(--app-compact-max-width) flex-col"
	contentClass="flex flex-1 flex-col"
	progress={{
		mode: 'check',
		days: progressDays,
		ariaLabel: 'Five-day chores progress'
	}}
>
	{#key data.date}
		<ChoresTimerSection
			localDate={data.date}
			complete={completed}
			interactive={isToday}
			{saveState}
			oncomplete={(completion) => void saveCompletion(completion)}
			onretry={retryCompletion}
		/>
	{/key}
</TrackerPage>
