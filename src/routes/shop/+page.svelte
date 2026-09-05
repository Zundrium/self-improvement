<script lang="ts">
import { untrack } from 'svelte';
import { Plus } from '@lucide/svelte';
import { apiRequest } from '$lib/api';
import type { Reward } from '$lib/api-types';
import GlimmerIcon from '$lib/components/gamification/GlimmerIcon.svelte';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { Button } from '$lib/components/ui/button';
import { Pressable } from '$lib/components/ui/pressable';
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
	<section class="flex items-center justify-center gap-5 py-5" aria-label="Available Glimmers">
		<GlimmerIcon class="size-20 sm:size-24" aria-hidden="true" />
		<div class="flex flex-col items-start">
			<strong class="text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl">
				{glimmers.toLocaleString()}
			</strong>
			<span class="mt-1 text-sm text-(--text-muted)">Glimmers</span>
		</div>
	</section>

	<TrackerSection title="Rewards" {colors}>
		<div class="grid grid-cols-2 gap-4">
			{#each data.rewards as reward (reward.id)}
				{@const affordable = glimmers >= reward.price}
				<Pressable
					class="h-auto min-w-0 flex-col justify-start gap-0 overflow-hidden rounded-3xl bg-(--bg-elevated) p-0 whitespace-normal text-(--text) hover:bg-(--bg-elevated) hover:text-(--text) disabled:opacity-100"
					disabled={!affordable}
					onclick={() => selectReward(reward)}
					aria-label={`${reward.name}, ${reward.price.toLocaleString()} Glimmers${affordable ? '' : ', unavailable'}`}
				>
					<span
						class="flex aspect-[4/3] w-full items-center justify-center overflow-hidden"
						aria-hidden="true"
					>
						<GlimmerIcon class="size-16" />
					</span>
					<span class="flex w-full flex-col p-4">
						<span class="line-clamp-2 min-h-10 w-full text-center text-sm leading-5 font-medium">
							{reward.name}
						</span>
						<span
							class="dynamic-background flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-(--app-on-color) tabular-nums"
							style:--dynamic-background={affordable ? colors.primary : 'var(--disabled-background)'}
						>
							<GlimmerIcon class="size-5" aria-hidden="true" />
							<strong class="text-xl font-semibold tracking-[-0.04em]">
								{reward.price.toLocaleString()}
							</strong>
						</span>
					</span>
				</Pressable>
			{/each}
			<Pressable
				href="/shop/rewards/new"
				class="aspect-square h-auto min-w-0 flex-col gap-3 rounded-3xl border-2 border-dotted border-(--text)/20 bg-transparent text-(--text-muted) hover:border-(--text)/32 hover:bg-transparent hover:text-(--text)"
				aria-label="Add a new reward"
			>
				<Plus class="size-8" />
				<span class="text-sm font-medium">Add reward</span>
			</Pressable>
		</div>
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
					<GlimmerIcon class="size-9" aria-hidden="true" />
					<span class="min-w-0 flex-1 truncate text-sm">{redemption.name}</span>
					<span class="flex items-center gap-1.5 text-xs text-(--text-muted) tabular-nums">
						<GlimmerIcon class="size-4" aria-hidden="true" />
						-{redemption.price}
					</span>
				</div>
			{/each}
		</TrackerSection>
	{/if}
</TrackerPage>

<Dialog bind:open={confirmationOpen}>
	<DialogContent>
		<DialogHeader>
			<GlimmerIcon class="mb-2 size-12" aria-hidden="true" />
			<DialogTitle>Claim {selectedReward?.name}?</DialogTitle>
			<DialogDescription>
				Spend {selectedReward?.price.toLocaleString()} of your {glimmers.toLocaleString()} Glimmers.
			</DialogDescription>
		</DialogHeader>
		{#if errorMessage}<p class="text-sm text-(--status-danger-text)">{errorMessage}</p>{/if}
		<DialogFooter>
			<Button size="medium" profile="plain" onclick={() => (confirmationOpen = false)}>Not yet</Button>
			<Button profile="highlighted" size="medium"
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
			<GlimmerIcon class="size-16" aria-hidden="true" />
			<div>
				<DialogTitle>Enjoy {claimedReward?.name}</DialogTitle>
				<DialogDescription class="mt-2">You earned this one.</DialogDescription>
			</div>
			<Button profile="highlighted" size="medium"
				onclick={() => (celebrationOpen = false)}>Done</Button
			>
		</div>
	</DialogContent>
</Dialog>
