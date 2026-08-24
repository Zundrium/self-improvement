<script lang="ts">
	import { LockKeyhole, Moon } from '@lucide/svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import DataFlow from './dataFlow.svelte';
	import GuideSteps from './guideSteps.svelte';

	const setupSteps = [
		{
			title: 'Choose tracked apps',
			description:
				'Open Screen time and select at least one app. Sleep uses the same list to decide which foreground activity counts after bedtime.'
		},
		{
			title: 'Allow Usage Access',
			description:
				'Open Android’s Usage access screen, select Self Improvement, and enable Permit usage access.'
		},
		{
			title: 'Set your bedtime',
			description:
				'Open Sleep settings to choose your cutoff. The default is 22:30, with an optional reminder 15 minutes beforehand.'
		},
		{
			title: 'Synchronize after the window',
			description:
				'Open Self Improvement after the four-hour bedtime window. Detailed Android activity events are read when the app synchronizes.'
		}
	];
</script>

<div class="space-y-5">
	<Alert>
		<Moon />
		<AlertTitle>Sleep tracks bedtime adherence</AlertTitle>
		<AlertDescription>
			A day fails only when selected apps exceed five cumulative foreground minutes during the four
			hours after bedtime.
		</AlertDescription>
	</Alert>

	<Card>
		<CardHeader>
			<CardTitle>How bedtime activity reaches Self Improvement</CardTitle>
			<CardDescription>There is no wearable or health-data connection.</CardDescription>
		</CardHeader>
		<CardContent>
			<DataFlow items={['Android app activity', 'Usage Access', 'Bedtime adherence']} />
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<LockKeyhole class="size-5" /> Enable bedtime tracking
			</CardTitle>
			<CardDescription>Usage Access is shared with Screen time.</CardDescription>
		</CardHeader>
		<CardContent><GuideSteps steps={setupSteps} /></CardContent>
	</Card>

	<Card>
		<CardHeader><CardTitle>What screen activity means</CardTitle></CardHeader>
		<CardContent class="text-sm leading-6 text-(--text)/64">
			<p>
				The latest screen-interactive time is retained as context, but turning on the screen does
				not fail a bedtime day by itself. Only foreground intervals from selected apps count.
			</p>
		</CardContent>
	</Card>
</div>
