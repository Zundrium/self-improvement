<script lang="ts">
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import BedtimeSection from './components/bedtimeSection.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Sleep · Self Improvement</title>
	<meta name="description" content="Keep your bedtime in view." />
</svelte:head>

<TrackerPage
	class="flex max-w-(--app-compact-max-width) flex-col"
	contentClass="flex flex-1 items-center justify-center"
	progress={{
		mode: 'check',
		days: data.progressDays,
		ariaLabel: 'Five-day bedtime progress'
	}}
>
	<BedtimeSection bedtime={data.bedtime} />
</TrackerPage>
