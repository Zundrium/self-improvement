<script lang="ts">
	import { untrack } from 'svelte';
	import { Pencil, Plus, ShoppingBag, Trash2 } from '@lucide/svelte';
	import { apiRequest } from '$lib/api';
	import type { Reward } from '$lib/api-types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import { gameGradient, gamificationColors } from '$lib/gamification/theme';

	let { initialRewards }: { initialRewards: Reward[] } = $props();
	let rewards = $state(untrack(() => initialRewards));
	let editorOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedReward = $state<Reward>();
	let name = $state('');
	let emoji = $state('✨');
	let price = $state(150);
	let busy = $state(false);
	let errorMessage = $state('');

	function addReward() {
		selectedReward = undefined;
		name = '';
		emoji = '✨';
		price = 150;
		errorMessage = '';
		editorOpen = true;
	}

	function editReward(reward: Reward) {
		selectedReward = reward;
		name = reward.name;
		emoji = reward.emoji;
		price = reward.price;
		errorMessage = '';
		editorOpen = true;
	}

	function confirmDelete(reward: Reward) {
		selectedReward = reward;
		errorMessage = '';
		deleteOpen = true;
	}

	async function saveReward(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		errorMessage = '';
		try {
			const saved = await apiRequest<Reward>(rewardUrl(), {
				method: selectedReward ? 'PATCH' : 'POST',
				body: JSON.stringify({ name, emoji, price })
			});
			rewards = selectedReward
				? rewards.map((reward) => (reward.id === saved.id ? saved : reward))
				: [...rewards, saved].sort((left, right) => left.price - right.price);
			editorOpen = false;
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : 'Could not save this reward.';
		} finally {
			busy = false;
		}
	}

	async function deleteSelectedReward() {
		if (!selectedReward) return;
		busy = true;
		errorMessage = '';
		try {
			await apiRequest(`/api/app/rewards/${selectedReward.id}`, { method: 'DELETE' });
			rewards = rewards.filter(({ id }) => id !== selectedReward?.id);
			deleteOpen = false;
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : 'Could not delete this reward.';
		} finally {
			busy = false;
		}
	}

	function rewardUrl() {
		return selectedReward ? `/api/app/rewards/${selectedReward.id}` : '/api/app/rewards';
	}
</script>

<Card id="rewards">
	<CardHeader>
		<div class="flex items-start justify-between gap-3">
			<div>
				<CardTitle>My Shop</CardTitle>
				<p class="mt-1 text-sm leading-5 text-(--text)/56">
					Create the rewards you want to earn with Glimmers.
				</p>
			</div>
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm shadow-black/10"
				style={`background: ${gameGradient(gamificationColors.glimmers)}`}
			>
				<ShoppingBag class="size-5" />
			</span>
		</div>
	</CardHeader>
	<CardContent class="space-y-4">
		{#if rewards.length}
			<div class="divide-y divide-(--text)/8">
				{#each rewards as reward (reward.id)}
					<div class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
						<span class="text-2xl" aria-hidden="true">{reward.emoji}</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{reward.name}</p>
							<p class="text-xs text-(--text)/48">{reward.price.toLocaleString()} Glimmers</p>
						</div>
						<Button
							size="icon"
							variant="ghost"
							class="size-9"
							aria-label={`Edit ${reward.name}`}
							onclick={() => editReward(reward)}
						>
							<Pencil class="size-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							class="size-9"
							aria-label={`Delete ${reward.name}`}
							onclick={() => confirmDelete(reward)}
						>
							<Trash2 class="size-4" />
						</Button>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm leading-6 text-(--text)/56">Your shop does not have any rewards yet.</p>
		{/if}
		<div class="flex flex-wrap gap-2">
			<Button type="button" onclick={addReward}><Plus class="mr-2 size-4" /> Add reward</Button>
			<Button href="/shop" variant="ghost">Open shop</Button>
		</div>
	</CardContent>
</Card>

<Dialog bind:open={editorOpen}>
	<DialogContent>
		<form class="space-y-5" onsubmit={saveReward}>
			<DialogHeader>
				<DialogTitle>{selectedReward ? 'Edit reward' : 'Add reward'}</DialogTitle>
				<DialogDescription
					>Give your reward a name, a fun icon, and a Glimmer price.</DialogDescription
				>
			</DialogHeader>
			<FieldGroup>
				<Field>
					<FieldLabel for="reward-name">Reward</FieldLabel>
					<Input
						id="reward-name"
						bind:value={name}
						maxlength={80}
						placeholder="Favourite drink"
						required
					/>
				</Field>
				<div class="grid grid-cols-[6rem_1fr] gap-3">
					<Field>
						<FieldLabel for="reward-emoji">Icon</FieldLabel>
						<Input id="reward-emoji" bind:value={emoji} maxlength={16} required />
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
				</div>
			</FieldGroup>
			{#if errorMessage}<p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>{/if}
			<DialogFooter>
				<Button type="button" variant="ghost" onclick={() => (editorOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={busy}>
					{#if busy}<Spinner class="mr-2 size-4" />{/if} Save reward
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog bind:open={deleteOpen}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Delete {selectedReward?.name}?</DialogTitle>
			<DialogDescription
				>This removes it from your shop. Previous claims remain in your history.</DialogDescription
			>
		</DialogHeader>
		{#if errorMessage}<p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>{/if}
		<DialogFooter>
			<Button variant="ghost" onclick={() => (deleteOpen = false)}>Cancel</Button>
			<Button variant="destructive" disabled={busy} onclick={deleteSelectedReward}>
				{#if busy}<Spinner class="mr-2 size-4" />{/if} Delete reward
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
