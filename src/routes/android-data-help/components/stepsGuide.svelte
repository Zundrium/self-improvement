<script lang="ts">
	import { Database, Footprints, Watch } from '@lucide/svelte';
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
			title: 'Choose the device that counts',
			description:
				'With a Galaxy phone or Galaxy Watch, Samsung Health is the simplest source. Other options include Pixel Watch, Fitbit, and compatible fitness apps or wearables.'
		},
		{
			title: 'Check the source app first',
			description:
				'Carry the phone or wear the watch, then confirm that its health app shows today’s steps. If it shows zero there, Health Connect has nothing to share.'
		},
		{
			title: 'Let the source write steps',
			description:
				'Open the source app’s Health Connect settings and allow it to write Steps. For Samsung Health, use Settings → Health Connect → App permissions → Samsung Health.'
		},
		{
			title: 'Let Self Improvement read steps',
			description:
				'Open Health Connect → App permissions → Self Improvement and make sure Steps read access is enabled.'
		},
		{
			title: 'Find the entry and its source',
			description:
				'Open Health Connect → Data and access → Activity → Steps → See all entries. Open an entry to verify which app wrote it.'
		},
		{
			title: 'Synchronize Self Improvement',
			description:
				'Return here and tap Sync now. New steps can change throughout the day as the source app updates Health Connect.'
		}
	];
</script>

<div class="space-y-5">
	<Alert>
		<Footprints />
		<AlertTitle>Health Connect does not count steps</AlertTitle>
		<AlertDescription>
			A phone, watch, or fitness app counts them. Its companion app writes the total to Health
			Connect, where Self Improvement can read it.
		</AlertDescription>
	</Alert>

	<Card>
		<CardHeader>
			<CardTitle>How steps reach Self Improvement</CardTitle>
			<CardDescription>For your Galaxy Watch, use Samsung Health as the source.</CardDescription>
		</CardHeader>
		<CardContent
			><DataFlow
				items={['Phone or watch', 'Samsung Health', 'Health Connect', 'Self Improvement']}
			/></CardContent
		>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"
				><Watch class="size-5" /> Set up step measurement</CardTitle
			>
			<CardDescription
				>Always verify the measuring app before troubleshooting the reader.</CardDescription
			>
		</CardHeader>
		<CardContent><GuideSteps steps={setupSteps} /></CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"
				><Database class="size-5" /> Diagnose the missing link</CardTitle
			>
		</CardHeader>
		<CardContent class="text-sm leading-6 text-(--text)/64">
			<p>
				No steps in Samsung Health means the phone or watch is not measuring or synchronizing yet.
			</p>
			<p>
				Steps in Samsung Health but not Health Connect means Samsung Health’s write connection needs
				attention. Steps in Health Connect but not Self Improvement means its read permission or
				sync needs attention.
			</p>
		</CardContent>
	</Card>
</div>
