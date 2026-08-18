<script lang="ts">
	import { Check, ExternalLink, Wind } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { useDateSelectorState } from '$lib/components/date-selector-state.svelte';
	import BreathingExercise from './BreathingExercise.svelte';
	import {
		BREATHING_DURATION_SECONDS,
		BREATHING_ROUNDS,
		formatTimer,
		type BreathingCompletion,
		type SaveState
	} from './breathing';
	import type { PageProps } from './$types';

	type SavedExercise = BreathingCompletion & {
		technique: '4-7-8';
		durationSeconds: number;
	};

	let { data }: PageProps = $props();
	const dateSelectorState = useDateSelectorState();
	let loadedDate = $state(untrack(() => data.date));
	let savedExercise = $state<SavedExercise>();
	let pendingCompletion = $state<BreathingCompletion>();
	let saveState = $state<SaveState>('idle');
	const exerciseCompleted = $derived(Boolean(data.exercise || savedExercise));
	const isToday = $derived(data.date === data.today);

	$effect(() => {
		if (data.date === loadedDate) return;
		loadedDate = data.date;
		savedExercise = undefined;
		pendingCompletion = undefined;
		saveState = 'idle';
	});

	async function saveCompletion(completion: BreathingCompletion) {
		pendingCompletion = completion;
		saveState = 'saving';
		try {
			savedExercise = await postCompletion(completion);
			dateSelectorState.mark(completion.localDate, true);
			saveState = 'saved';
		} catch {
			saveState = 'error';
		}
	}

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

<main class="flex-1 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	<section class="mx-auto w-full max-w-md space-y-6">
		{#if isToday && !exerciseCompleted}
			<BreathingExercise
				localDate={data.date}
				{saveState}
				oncomplete={(completion) => void saveCompletion(completion)}
				onretry={retryCompletion}
			/>
		{:else}
			<section class="space-y-6 pt-8 text-center" aria-label="Daily breathing">
				<span
					class="mx-auto flex size-24 items-center justify-center rounded-full {exerciseCompleted
						? 'bg-(--text) text-(--bg)'
						: 'border border-(--text)/16'}"
				>
					{#if exerciseCompleted}<Check class="size-9" />{:else}<Wind class="size-9" />{/if}
				</span>
				<div class="space-y-2">
					<h1 class="text-2xl font-semibold tracking-[-0.04em]">
						{exerciseCompleted ? 'Breathing complete' : 'No breathing exercise'}
					</h1>
					<p class="text-sm leading-6 text-(--text)/56">
						{#if exerciseCompleted}
							4-7-8 breathing · {BREATHING_ROUNDS} rounds · {formatTimer(
								BREATHING_DURATION_SECONDS
							)}
						{:else}
							No exercise was completed on this day.
						{/if}
					</p>
				</div>
			</section>
		{/if}

		<a
			href="https://health.clevelandclinic.org/4-7-8-breathing"
			target="_blank"
			rel="noreferrer"
			class="flex items-center justify-between gap-4 border-t border-(--text)/8 py-5 text-sm"
		>
			<span>
				<span class="block font-medium">About the 4-7-8 method</span>
				<span class="mt-0.5 block text-xs text-(--text)/48">Cleveland Clinic guidance</span>
			</span>
			<ExternalLink class="size-4 text-(--text)/40" />
		</a>
	</section>
</main>
