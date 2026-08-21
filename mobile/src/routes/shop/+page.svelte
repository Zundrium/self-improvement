<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '@iconify/svelte';
	import { Sparkles, Star } from '@lucide/svelte';
	import { apiRequest } from '$lib/api';
	import type { Reward } from '$lib/api-types';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { gamificationColors } from '$lib/gamification/theme';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const colors = gamificationColors.glimmers;
	let glimmers = $state(untrack(() => data.glimmers));
	let selectedReward = $state<Reward>();
	let claimedReward = $state<Reward>();
	let confirmationOpen = $state(false);
	let celebrationOpen = $state(false);
	let redeeming = $state(false);
	let errorMessage = $state('');

	function selectReward(reward: Reward) {
		selectedReward = reward;
		errorMessage = '';
		confirmationOpen = true;
	}

	async function redeemSelectedReward() {
		if (!selectedReward || redeeming) return;
		redeeming = true;
		errorMessage = '';
		try {
			const result = await apiRequest<{ reward: Reward; glimmers: number }>(
				`/api/app/rewards/${selectedReward.id}/redeem`,
				{ method: 'POST' }
			);
			glimmers = result.glimmers;
			claimedReward = result.reward;
			confirmationOpen = false;
			celebrationOpen = true;
		} catch (cause) {
			errorMessage = cause instanceof Error ? cause.message : 'Could not claim this reward.';
		} finally {
			redeeming = false;
		}
	}
</script>

<svelte:head>
	<title>Glimmers · Self Improvement</title>
	<meta name="description" content="Spend Glimmers on personal rewards." />
</svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-9">
	<section
		class="flex flex-col items-center rounded-3xl px-5 py-6 text-center text-white"
		style={`background: ${colors.primary}`}
		aria-label="Available Glimmers"
	>
		<div class="flex items-center justify-center gap-2.5">
			<Icon icon="ph:coin-vertical-fill" class="size-8" aria-hidden="true" />
			<strong class="text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl">
				{glimmers.toLocaleString()}
			</strong>
		</div>
		<span class="mt-2 text-sm text-white">Glimmers</span>
	</section>

	<TrackerSection title="Rewards" {colors}>
		{#if data.rewards.length}
			<div class="grid grid-cols-2 gap-4">
				{#each data.rewards as reward (reward.id)}
					{@const affordable = glimmers >= reward.price}
					<Button
						variant="ghost"
						class="h-auto min-w-0 flex-col justify-start gap-0 overflow-hidden rounded-3xl bg-(--bg-elevated) p-0 whitespace-normal text-(--text) hover:bg-(--bg-elevated) hover:text-(--text) disabled:opacity-100"
						disabled={!affordable}
						onclick={() => selectReward(reward)}
						aria-label={`${reward.name}, ${reward.price.toLocaleString()} Glimmers${affordable ? '' : ', unavailable'}`}
					>
						<span
							class="flex aspect-[4/3] w-full items-center justify-center overflow-hidden"
							style={`background: ${colors.primary}`}
							aria-hidden="true"
						>
							<Star class="size-12 fill-white text-white" />
						</span>
						<span class="flex w-full flex-col p-4">
							<span class="line-clamp-2 min-h-10 w-full text-center text-sm leading-5 font-medium">
								{reward.name}
							</span>
							<span
								class="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-white tabular-nums"
								style={`background: ${affordable ? colors.primary : '#737373'}`}
							>
								<Icon icon="ph:coin-vertical-fill" class="size-5" />
								<strong class="text-xl font-semibold tracking-[-0.04em]">
									{reward.price.toLocaleString()}
								</strong>
							</span>
						</span>
					</Button>
				{/each}
			</div>
		{:else}
			<div class="space-y-3 py-4 text-center">
				<Sparkles class="mx-auto size-8" style={`color: ${colors.primary}`} />
				<p class="text-sm text-(--text)/56">Your shop does not have any rewards yet.</p>
				<Button
					href="/profile#rewards"
					class="text-white hover:text-white hover:brightness-110"
					style={`background: ${colors.primary}`}>Set up rewards</Button
				>
			</div>
		{/if}
	</TrackerSection>

	{#if data.redemptions.length}
		<TrackerSection
			title="Recently claimed"
			description="Rewards you have already earned."
			{colors}
			contentClass="space-y-5"
		>
			{#each data.redemptions as redemption (redemption.id)}
				<div class="flex items-center gap-4">
					<span class="flex size-9 items-center justify-center text-2xl" aria-hidden="true">
						{redemption.emoji}
					</span>
					<span class="min-w-0 flex-1 truncate text-sm">{redemption.name}</span>
					<span class="text-xs text-(--text)/48 tabular-nums">-{redemption.price}</span>
				</div>
			{/each}
		</TrackerSection>
	{/if}
</TrackerPage>

<Dialog bind:open={confirmationOpen}>
	<DialogContent>
		<DialogHeader>
			<div class="mb-2 text-5xl" aria-hidden="true">{selectedReward?.emoji}</div>
			<DialogTitle>Claim {selectedReward?.name}?</DialogTitle>
			<DialogDescription>
				Spend {selectedReward?.price.toLocaleString()} of your {glimmers.toLocaleString()} Glimmers.
			</DialogDescription>
		</DialogHeader>
		{#if errorMessage}<p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>{/if}
		<DialogFooter>
			<Button variant="ghost" onclick={() => (confirmationOpen = false)}>Not yet</Button>
			<Button
				class="text-white hover:text-white hover:brightness-110"
				style={`background: ${colors.primary}`}
				disabled={redeeming}
				onclick={redeemSelectedReward}
			>
				{#if redeeming}<Spinner class="mr-2 size-4" />{/if}
				Spend Glimmers
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<Dialog bind:open={celebrationOpen}>
	<DialogContent class="text-center">
		<div class="flex flex-col items-center gap-4 py-4">
			<div class="text-6xl" aria-hidden="true">{claimedReward?.emoji}</div>
			<div>
				<DialogTitle>Enjoy {claimedReward?.name}</DialogTitle>
				<DialogDescription class="mt-2">You earned this one.</DialogDescription>
			</div>
			<Button
				class="text-white hover:text-white hover:brightness-110"
				style={`background: ${colors.primary}`}
				onclick={() => (celebrationOpen = false)}>Done</Button
			>
		</div>
	</DialogContent>
</Dialog>
