<script lang="ts">
	import { Check, Clock3, Moon, TriangleAlert } from '@lucide/svelte';
	import type { SleepAdherenceSummary } from '$lib/api-types';
	import { Badge } from '$lib/components/ui/badge';
	import { formatBedtime, formatUsageSeconds, statusLabel } from '../sleep';

	type Props = {
		summary: SleepAdherenceSummary;
		setupRequired: boolean;
		isToday: boolean;
	};

	let { summary, setupRequired, isToday }: Props = $props();
	const title = $derived(isToday ? 'Tonight' : 'Bedtime result');
	const latestActivity = $derived(
		summary.latestScreenActivityAt
			? new Date(summary.latestScreenActivityAt).toLocaleTimeString([], {
					hour: 'numeric',
					minute: '2-digit'
				})
			: 'None recorded'
	);
	const description = $derived(statusDescription(summary, setupRequired));

	function statusDescription(summary: SleepAdherenceSummary, setupRequired: boolean) {
		if (setupRequired)
			return 'Choose tracked apps in Screen time before bedtime adherence can be judged.';
		if (summary.status === 'pass')
			return 'Selected apps stayed within the five-minute allowance after bedtime.';
		if (summary.status === 'fail')
			return 'Selected apps were active for more than five minutes in the four-hour bedtime window.';
		return 'The result settles after the four-hour window ends and the app synchronizes.';
	}

	function statusClass(status: SleepAdherenceSummary['status'], setupRequired: boolean) {
		if (setupRequired || status === 'fail') {
			return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
		}
		if (status === 'pass') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
		return 'bg-(--text)/8 text-(--text)/64';
	}
</script>

<section
	class="rounded-3xl bg-(--text)/5 p-6"
	aria-labelledby="sleep-status-title"
	data-motion-item
>
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="text-sm font-medium text-(--text)/48">{title}</p>
			<h2 id="sleep-status-title" class="mt-1 text-3xl font-medium tracking-[-0.05em]">
				{formatBedtime(summary.configuredBedtime)}
			</h2>
		</div>
		<Badge class={statusClass(summary.status, setupRequired)}>
			{#if setupRequired}
				<TriangleAlert class="size-3.5" />
			{:else if summary.status === 'pass'}
				<Check class="size-3.5" />
			{:else if summary.status === 'fail'}
				<TriangleAlert class="size-3.5" />
			{:else}
				<Clock3 class="size-3.5" />
			{/if}
			{statusLabel(summary.status, setupRequired)}
		</Badge>
	</div>
	<p class="mt-5 max-w-xl text-sm leading-6 text-(--text)/64">{description}</p>
	<div class="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
		<div>
			<p class="text-xs text-(--text)/40">Selected-app activity</p>
			<p class="mt-0.5 font-medium">{formatUsageSeconds(summary.lateUsageSeconds)}</p>
		</div>
		<div>
			<p class="text-xs text-(--text)/40">Latest screen activity</p>
			<p class="mt-0.5 font-medium">{latestActivity}</p>
		</div>
	</div>
</section>

{#if !setupRequired}
	<div class="flex items-center gap-2 text-xs leading-5 text-(--text)/40" data-motion-item>
		<Moon class="size-4 shrink-0" />
		Screen activity is shown for context; only selected-app foreground time can fail the day.
	</div>
{/if}
