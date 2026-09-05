<script lang="ts">
import { onDestroy, untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import type { StretchSession, StretchSettingsData } from '$lib/api-types';
import { useDateSelectorState } from '$lib/components/tracker/date-selection-context.svelte';
import { DateBoundRequestLifetime } from '$lib/forms/date-bound-request';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { toast } from '$lib/components/ui/toast';
import type { StretchActivityId, StretchDifficulty } from '$lib/local/tracker-settings';
import type { PageProps } from './$types';
import StretchRoutineSection from './components/stretchRoutineSection.svelte';
import type { SaveState, StretchCompletion } from './stretch';

let { data }: PageProps = $props();
const dateSelectorState = useDateSelectorState();
let loadedDate = $state(untrack(() => data.date));
const completionRequests = new DateBoundRequestLifetime(untrack(() => data.date));
let savedSession = $state<StretchSession>();
let pendingCompletion = $state<StretchCompletion>();
let difficulties = $state(untrack(() => ({ ...data.settings.difficulties })));
let saveState = $state<SaveState>('idle');
const completed = $derived(data.sessions.length > 0 || Boolean(savedSession));
const interactive = $derived(data.date === data.today);
const progressDays = $derived(
	data.progressDays.map((day) => (day.date === data.date && completed ? { ...day, value: 1 } : day))
);

$effect(() => resetDate(data.date));

function resetDate(nextDate: string) {
	if (nextDate === loadedDate) return;
	loadedDate = nextDate;
	completionRequests.syncDate(nextDate);
	savedSession = undefined;
	pendingCompletion = undefined;
	saveState = 'idle';
}

async function saveCompletion(completion: StretchCompletion) {
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

function postCompletion(completion: StretchCompletion) {
	return apiRequest<StretchSession>('/api/app/stretch', {
		method: 'POST',
		body: JSON.stringify(completion)
	});
}

function retryCompletion() {
	if (pendingCompletion) void saveCompletion(pendingCompletion);
}

async function saveDifficulty(activityId: StretchActivityId, difficulty: StretchDifficulty) {
	difficulties = { ...difficulties, [activityId]: difficulty };
	try {
		await apiRequest<StretchSettingsData>('/api/app/stretch/settings', {
			method: 'PATCH',
			body: JSON.stringify({ difficulties: { [activityId]: difficulty } })
		});
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'Could not save the stretch level.';
		toast.error(message);
	}
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
	progress={{
		mode: 'check',
		days: progressDays,
		ariaLabel: 'Five-day stretch progress'
	}}
>
	<StretchRoutineSection
		localDate={data.date}
		holdSeconds={data.settings.holdSeconds}
		{difficulties}
		scheduled={data.scheduled}
		{interactive}
		completedBefore={completed}
		{saveState}
		oncomplete={(completion) => void saveCompletion(completion)}
		onretry={retryCompletion}
		ondifficultychange={(activityId, difficulty) => void saveDifficulty(activityId, difficulty)}
	/>
</TrackerPage>
