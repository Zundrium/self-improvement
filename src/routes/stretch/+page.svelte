<script lang="ts">
import { untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import type { StretchSession } from '$lib/api-types';
import { useDateSelectorState } from '$lib/components/dateSelectorState.svelte';
import TrackerPage from '$lib/components/trackerPage.svelte';
import type { PageProps } from './$types';
import StretchRoutine from './components/stretchRoutine.svelte';
import type { SaveState, StretchCompletion } from './stretch';

let { data }: PageProps = $props();
const dateSelectorState = useDateSelectorState();
let loadedDate = $state(untrack(() => data.date));
let savedSession = $state<StretchSession>();
let pendingCompletion = $state<StretchCompletion>();
let saveState = $state<SaveState>('idle');
const completed = $derived(data.sessions.length > 0 || Boolean(savedSession));
const interactive = $derived(data.date === data.today);

$effect(() => resetDate(data.date));

function resetDate(nextDate: string) {
	if (nextDate === loadedDate) return;
	loadedDate = nextDate;
	savedSession = undefined;
	pendingCompletion = undefined;
	saveState = 'idle';
}

async function saveCompletion(completion: StretchCompletion) {
	pendingCompletion = completion;
	saveState = 'saving';
	try {
		savedSession = await postCompletion(completion);
		dateSelectorState.mark(completion.localDate, true);
		saveState = 'saved';
	} catch {
		saveState = 'error';
	}
}

function postCompletion(completion: StretchCompletion) {
	return apiRequest<StretchSession>('/api/app/stretch', {
		method: 'POST',
		body: JSON.stringify(completion)
	});
}

function retryCompletion() {
	if (pendingCompletion) void saveCompletion(pendingCompletion);
}
</script>

<svelte:head>
	<title>Stretch · Self Improvement</title>
	<meta
		name="description"
		content="A guided weekday flexibility routine with two sets per stretch."
	/>
</svelte:head>

<TrackerPage
	class="flex min-h-0 max-w-3xl flex-col"
	contentClass="flex min-h-0 flex-1 flex-col gap-8 space-y-0"
>
	<StretchRoutine
		localDate={data.date}
		holdSeconds={data.settings.holdSeconds}
		scheduled={data.scheduled}
		{interactive}
		completedBefore={completed}
		{saveState}
		oncomplete={(completion) => void saveCompletion(completion)}
		onretry={retryCompletion}
	/>
</TrackerPage>
