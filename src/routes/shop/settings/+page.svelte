<script lang="ts">
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import RewardSettings from './rewardSettings.svelte';
import type { PageProps } from './$types';

let { data }: PageProps = $props();
</script>

<svelte:head><title>Shop settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-8">
	<RewardSettings initialRewards={data.rewards} />
</TrackerPage>
