<script lang="ts">
	import { LockKeyhole, Smartphone } from '@lucide/svelte';
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
			title: 'Allow restricted settings if Android asks',
			description:
				'For a sideloaded installation, open Android Settings → Apps → Self Improvement, tap ⋮ in the top-right corner, and choose Allow restricted settings. Play Store installations normally skip this.'
		},
		{
			title: 'Open Usage Access',
			description:
				'Open Android’s Usage access or Usage data access screen, select Self Improvement, and enable Permit usage access.'
		},
		{
			title: 'Generate some app usage',
			description:
				'Use a few apps normally. Android records how long each app remains in the foreground; Self Improvement excludes its own usage.'
		},
		{
			title: 'Synchronize Self Improvement',
			description:
				'Return here and tap Sync now. If the permission was just enabled, use another app for at least a minute before checking again.'
		}
	];
</script>

<div class="space-y-5">
	<Alert>
		<Smartphone />
		<AlertTitle>Android itself is the screen-time source</AlertTitle>
		<AlertDescription>
			Screen time does not use Health Connect. Self Improvement reads Android’s app-usage history
			directly after you grant Usage Access.
		</AlertDescription>
	</Alert>

	<Card>
		<CardHeader>
			<CardTitle>How screen time reaches Self Improvement</CardTitle>
			<CardDescription>There is no separate health app or wearable in this path.</CardDescription>
		</CardHeader>
		<CardContent
			><DataFlow
				items={['Android app usage history', 'Usage Access', 'Self Improvement']}
			/></CardContent
		>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"
				><LockKeyhole class="size-5" /> Enable screen time</CardTitle
			>
			<CardDescription>Usage Access is a special Android permission.</CardDescription>
		</CardHeader>
		<CardContent><GuideSteps steps={setupSteps} /></CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>Digital Wellbeing is not the source</CardTitle>
		</CardHeader>
		<CardContent class="text-sm leading-6 text-(--text)/64">
			<p>
				Digital Wellbeing and Self Improvement both use Android’s underlying usage history. Self
				Improvement does not import from Digital Wellbeing, so Digital Wellbeing does not need to be
				enabled.
			</p>
			<p>
				Their totals can differ because apps group foreground time, system activity, and rounding in
				different ways.
			</p>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle>What Usage Access provides</CardTitle>
		</CardHeader>
		<CardContent class="text-sm leading-6 text-(--text)/64">
			<p>
				Self Improvement reads package-level foreground duration and last-used time for recent days.
				Usage Access does not provide message contents or what appeared on the screen.
			</p>
		</CardContent>
	</Card>
</div>
