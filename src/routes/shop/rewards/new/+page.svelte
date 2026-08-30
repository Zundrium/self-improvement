<script lang="ts">
	import { Form } from '$lib/components/ui/form';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { ArrowLeft } from '@lucide/svelte';
import { apiRequest } from '$lib/api';
import type { Reward } from '$lib/api-types';
import TrackerPage from '$lib/components/trackerPage.svelte';
import { Button } from '$lib/components/ui/button';
import { Card } from '$lib/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { Spinner } from '$lib/components/ui/spinner';
import { toast } from '$lib/components/ui/toast';

let name = $state('');
let price = $state(150);
let busy = $state(false);
let errorMessage = $state('');

async function saveReward(event: SubmitEvent) {
	event.preventDefault();
	if (busy) return;
	busy = true;
	errorMessage = '';
	try {
		await apiRequest<Reward>('/api/app/rewards', {
			method: 'POST',
			body: JSON.stringify({ name, price })
		});
		toast.success('Reward added.');
		await goto(resolve('/shop'));
	} catch (cause) {
		errorMessage = cause instanceof Error ? cause.message : 'Could not save this reward.';
	} finally {
		busy = false;
	}
}
</script>

<svelte:head>
	<title>Add reward · Self Improvement</title>
	<meta name="description" content="Add a personal reward to your Glimmer shop." />
</svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-6">
	<div class="flex items-center gap-3">
		<Button href="/shop" variant="ghost" size="icon" aria-label="Back to shop">
			<ArrowLeft class="size-4" />
		</Button>
		<div>
			<h2 class="text-xl font-medium tracking-[-0.03em]">Add reward</h2>
			<p class="text-sm text-(--text)/48">Choose something you want to earn.</p>
		</div>
	</div>

	<Card>
		<Form onsubmit={saveReward}>
			<FieldGroup>
				<Field>
					<FieldLabel for="reward-name">Reward</FieldLabel>
					<Input
						id="reward-name"
						bind:value={name}
						maxlength={80}
						placeholder="Favourite drink"
						autocomplete="off"
						required
					/>
				</Field>
				<Field>
					<FieldLabel for="reward-price">Glimmers</FieldLabel>
					<Input
						id="reward-price"
						bind:value={price}
						type="number"
						min={1}
						max={1000000}
						required
					/>
				</Field>
			</FieldGroup>

			{#if errorMessage}
				<p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<Button href="/shop" variant="ghost">Cancel</Button>
				<Button type="submit" disabled={busy}>
					{#if busy}<Spinner class="mr-2 size-4" />{/if}
					Add reward
				</Button>
			</div>
		</Form>
	</Card>
</TrackerPage>
