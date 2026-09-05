<script lang="ts">
import type { ComponentProps } from 'svelte';
import Home from '../../src/routes/+page.svelte';

let data = $state({
	actionFeed: { date: '2026-03-20', items: [], daySummary: {} },
	nativeItems: [],
	enabledTrackers: []
} as unknown as ComponentProps<typeof Home>['data']);
</script>

<button type="button" onclick={() => (data = { ...data, actionFeed: { ...data.actionFeed }, nativeItems: [], enabledTrackers: [] })}>Refresh loader data</button>
<Home {data} params={{}} />
