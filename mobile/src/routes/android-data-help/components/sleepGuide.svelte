<script lang="ts">
	import { CircleHelp, Database, Watch } from '@lucide/svelte';
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
			title: 'Pair and update the watch',
			description:
				'Pair your Galaxy Watch through Galaxy Wearable. Update the watch software and Samsung Health on both the watch and phone.'
		},
		{
			title: 'Wear the watch overnight',
			description:
				'Charge it before bed and wear it snugly above the wrist bone. Galaxy Watch detects sleep automatically; a bedtime schedule is not required.'
		},
		{
			title: 'Let Samsung Health write sleep',
			description:
				'On the phone, open Samsung Health → Settings → Health Connect → App permissions → Samsung Health, then allow Sleep. Open Samsung Health again after changing this permission.'
		},
		{
			title: 'Let Self Improvement read sleep',
			description:
				'Open Health Connect → App permissions → Self Improvement and make sure Sleep read access is enabled.'
		},
		{
			title: 'Verify the complete path',
			description:
				'After waking, first find the session in Samsung Health. Then check Health Connect → Data and access → Sleep → Sleep sessions → See all entries. The entry should name Samsung Health as its source.'
		},
		{
			title: 'Synchronize Self Improvement',
			description:
				'Return here and tap Sync now. Overnight sleep appears on the date when the session ended.'
		}
	];
</script>

<div class="space-y-5">
	<Alert>
		<Watch />
		<AlertTitle>Your Galaxy Watch is the measuring source</AlertTitle>
		<AlertDescription>
			Health Connect stores the finished sleep session. It does not detect sleep itself, and Self
			Improvement only reads what Samsung Health writes.
		</AlertDescription>
	</Alert>

	<Card>
		<CardHeader>
			<CardTitle>How sleep reaches Self Improvement</CardTitle>
			<CardDescription>The session is normally written after you wake up.</CardDescription>
		</CardHeader>
		<CardContent
			><DataFlow
				items={['Galaxy Watch', 'Samsung Health', 'Health Connect', 'Self Improvement']}
			/></CardContent
		>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"
				><Watch class="size-5" /> Set up Galaxy Watch sleep</CardTitle
			>
			<CardDescription>Complete the path once, then wear the watch each night.</CardDescription>
		</CardHeader>
		<CardContent><GuideSteps steps={setupSteps} /></CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<CircleHelp class="size-5" /> Why not use screen-off time?
			</CardTitle>
		</CardHeader>
		<CardContent class="text-sm leading-6 text-(--text)/64">
			<p>
				A dark screen can mean sleep, charging, reading, music, or simply leaving the phone alone.
				Android therefore does not turn long screen-off periods into Health Connect sleep sessions.
			</p>
			<p>
				Bedtime mode and a sleep schedule can reduce interruptions and set goals, but they do not
				measure sleep. A watch is the more dependable source.
			</p>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"
				><Database class="size-5" /> Other compatible sources</CardTitle
			>
			<CardDescription
				>Use one app or wearable that can write Sleep to Health Connect.</CardDescription
			>
		</CardHeader>
		<CardContent class="text-sm leading-6 text-(--text)/64">
			<p>
				Examples include Pixel Watch or Fitbit, Oura, and phone-based trackers such as Sleep as
				Android.
			</p>
			<p>
				Self Improvement currently needs recent sleep-stage detail. Galaxy Watch normally supplies
				this; a manual duration-only entry may not import.
			</p>
		</CardContent>
	</Card>
</div>
