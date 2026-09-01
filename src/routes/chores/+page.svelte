<script lang="ts">
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import type { ChoresSession } from '$lib/api-types';
	import { useDateSelectorState } from '$lib/components/dateSelectorState.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import ChoresTimer from './components/choresTimer.svelte';
	import type { ChoresCompletion, SaveState } from './chores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const dateSelectorState = useDateSelectorState();
	let loadedDate = $state(untrack(() => data.date));
	let savedSession = $state<ChoresSession>();
	let pendingCompletion = $state<ChoresCompletion>();
	let saveState = $state<SaveState>('idle');

	const isToday = $derived(data.date === data.today);
	const completed = $derived(Boolean(data.session || savedSession));

	$effect(() => {
		if (data.date === loadedDate) return;
		loadedDate = data.date;
		savedSession = undefined;
		pendingCompletion = undefined;
		saveState = 'idle';
	});

	async function saveCompletion(completion: ChoresCompletion) {
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

<TrackerPage class="flex max-w-(--app-compact-max-width) flex-col" contentClass="flex flex-1 flex-col">
	{#key data.date}
		<ChoresTimer
			localDate={data.date}
			complete={completed}
			interactive={isToday}
			{saveState}
			oncomplete={(completion) => void saveCompletion(completion)}
			onretry={retryCompletion}
		/>
	{/key}
</TrackerPage>
