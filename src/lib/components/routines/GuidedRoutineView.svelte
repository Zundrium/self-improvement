<script lang="ts">
import { Info, Pause, Play, SkipForward, X } from '@lucide/svelte';
import { BottomActionButton, BottomActionGroup } from '$lib/components/ui/bottom-action-bar/index';
import { Button } from '$lib/components/ui/button/index';
import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index';
import { Progress } from '$lib/components/ui/progress/index';
import { Slider } from '$lib/components/ui/slider/index';
import type { RoutineController } from '$lib/routines/controller.svelte';
import type { GuidedRoutineActivity } from '$lib/routines/model';

interface Props {
	controller: RoutineController;
	activityCount: number;
	activityLabel: string;
}

let { controller, activityCount, activityLabel }: Props = $props();

function formatTime(milliseconds: number) {
	const seconds = Math.ceil(milliseconds / 1000);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
</script>

{#snippet cadenceControl()}
	{#if controller.cadenceTarget && controller.targetCadence !== null}
		<div class="flex items-center gap-3 py-1">
			<span class="shrink-0 text-sm font-medium">Speed</span>
			<span class="shrink-0 text-sm text-(--text-muted) tabular-nums"
				>{controller.targetCadence}%</span
			>
			<div class="min-w-0 flex-1">
				<Slider
					type="single"
					value={controller.targetCadence}
					min={50}
					max={150}
					step={5}
					onValueChange={controller.handleCadenceChange}
					onValueCommit={controller.commitCadence}
					aria-label={`${controller.cadenceTarget.name} speed`}
				/>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet activityTitle(activity: GuidedRoutineActivity)}
	<div class="relative flex items-center justify-center">
		<h2 class="min-w-0 px-10 text-center text-2xl font-medium tracking-[-0.04em]">
			{activity.name}
		</h2>
		{#if activity.instruction}
			<Popover>
				<PopoverTrigger>
					{#snippet child({ props })}
						<Button
							profile="plain"
							size="small"
							format="icon"
							class="absolute right-0"
							aria-label={`How to do ${activity.name}`}
							{...props}
						>
							<Info class="size-4" />
						</Button>
					{/snippet}
				</PopoverTrigger>
				<PopoverContent align="end" class="w-[min(20rem,calc(100vw-2rem))] text-center">
					<p class="text-sm font-medium">How to do {activity.name}</p>
					<p class="mt-2 text-sm leading-6 text-(--text)/64">{activity.instruction}</p>
				</PopoverContent>
			</Popover>
		{/if}
	</div>
{/snippet}

{#snippet sessionControls(activity: GuidedRoutineActivity)}
	<BottomActionGroup>
		<BottomActionButton
			format="icon"
			onclick={controller.close}
			aria-label={`Close ${activityLabel.toLowerCase()}`}
		>
			<X class="size-5" />
		</BottomActionButton>
		{#if controller.isManualReps && activity.type === 'manual-reps'}
			<BottomActionButton tone="primary" onclick={controller.completeManualActivity}>
				Finish {activity.reps} reps
			</BottomActionButton>
		{:else}
			<BottomActionButton tone="primary" onclick={controller.togglePause}>
				{#if controller.isPaused}
					<Play class="mr-2 size-4 fill-current" /> Resume
				{:else}
					<Pause class="mr-2 size-4 fill-current" /> Pause
				{/if}
			</BottomActionButton>
		{/if}
		<BottomActionButton format="icon" onclick={controller.skip} aria-label="Skip current step">
			<SkipForward class="size-4" />
		</BottomActionButton>
	</BottomActionGroup>
{/snippet}

{#if controller.currentActivity && controller.displayActivity}
	<section
		class="flex min-h-0 flex-1 flex-col justify-center-safe gap-4"
		aria-label={`Active ${activityLabel.toLowerCase()}`}
	>
		<div class="shrink-0 text-center">
			{#if controller.phase === 'intro'}
				{@render activityTitle(controller.currentActivity)}
			{:else if controller.phase === 'rest'}
				<p class="text-xs font-medium text-(--text-muted)">UP NEXT</p>
				<div class="mt-0.5">{@render activityTitle(controller.displayActivity)}</div>
				{#if controller.displayActivity.detail && !controller.displaySide}
					<p class="mt-1 text-sm text-(--text-muted)">{controller.displayActivity.detail}</p>
				{/if}
			{:else}
				{@render activityTitle(controller.currentActivity)}
			{/if}
		</div>

		<div class="min-h-40 flex-1 overflow-hidden">
			<img
				src={controller.displayImageUrl}
				alt={controller.displayActivity.name}
				class="size-full object-contain"
			/>
		</div>

		<div
			class={`grid shrink-0 gap-2 text-center text-sm font-medium tabular-nums ${controller.displayActivity.type === 'cadenced-reps' || controller.displaySide ? 'grid-cols-3' : 'grid-cols-2'}`}
		>
			<div class="rounded-2xl px-3 py-2 text-(--status-info-text)">
				{activityLabel} {controller.displayPosition.activityIndex + 1} / {activityCount}
			</div>
			<div class="rounded-2xl px-3 py-2 text-(--status-violet-text)">
				Set {controller.displaySetIndex + 1} / {controller.displaySetCount}
			</div>
			{#if controller.displayActivity.type === 'cadenced-reps'}
				<div class="rounded-2xl px-3 py-2 text-(--status-success-bright-text)">
					Rep {controller.displayRep} / {controller.displayActivity.reps}
				</div>
			{:else if controller.displaySide}
				<div class="rounded-2xl px-3 py-2 text-(--status-success-bright-text)">
					{controller.displaySide}
				</div>
			{/if}
		</div>

		<div class="shrink-0 space-y-4">
			<div class="text-center">
				{#if controller.isManualReps && controller.currentActivity.type === 'manual-reps'}
					<div class="text-5xl font-medium tracking-[-0.08em] tabular-nums sm:text-7xl">
						{controller.currentActivity.reps}
					</div>
					<p class="mt-1 text-sm text-(--text-muted)">slow reps</p>
				{:else}
					<div class="text-5xl font-medium tracking-[-0.08em] tabular-nums sm:text-7xl">
						{formatTime(controller.timeLeftMs)}
					</div>
				{/if}
			</div>
			<Progress class="h-3" value={controller.isManualReps ? 0 : controller.progress} animated={false} />
			{@render cadenceControl()}
			{#if controller.displayActivity.imageVariants?.length}
				<div
					class="grid shrink-0 grid-cols-3 gap-2"
					aria-label={`${controller.displayActivity.name} level`}
				>
					{#each controller.displayActivity.imageVariants as variant (variant.id)}
						<Button
							profile={controller.selectedImageVariant?.id === variant.id ? 'active' : 'plain'}
							size="small"
							onclick={() =>
								controller.selectImageVariant(controller.displayActivity!, variant.id)}
							aria-pressed={controller.selectedImageVariant?.id === variant.id}>{variant.label}</Button
						>
					{/each}
				</div>
			{/if}
			<div>{@render sessionControls(controller.currentActivity)}</div>
		</div>
	</section>
{/if}
