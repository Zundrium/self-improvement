<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { HappinessSettingsData } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { happinessRatings, type HappinessRating } from '../happiness';
import type { PageProps } from './$types';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { data }: PageProps = $props();
let defaultRating = $state<HappinessRating>(untrack(() => data.defaultRating));
let saving = $state(false);
let savedDefaultRating = $state(untrack(() => data.defaultRating));
const dirty = $derived(defaultRating !== savedDefaultRating);
guardUnsavedNavigation(() => dirty && !saving);
$effect(() => {
	if (!dirty && !saving && data.defaultRating !== savedDefaultRating)
		defaultRating = savedDefaultRating = data.defaultRating;
});

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	try {
		await apiRequest<HappinessSettingsData>('/api/app/happiness/settings', {
			method: 'PATCH',
			body: JSON.stringify({ defaultRating })
		});
		savedDefaultRating = defaultRating;
		toast.success('Happiness settings updated.');
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() =>
			toast.error('Saved, but could not refresh the page.')
		);
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not update happiness settings.');
	} finally {
		saving = false;
	}
}
</script>

<svelte:head><title>Happiness settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-5">
	<Card>
		<CardHeader><CardTitle>Daily check-in</CardTitle></CardHeader>
		<CardContent>
			<Form id="happiness-settings" class="space-y-0" onsubmit={saveSettings}>
				<Field class="gap-4 sm:flex-row sm:items-center sm:justify-between">
					<FieldLabel>Default happiness level</FieldLabel>
					<div class="grid grid-cols-5 gap-2">
						{#each happinessRatings as rating (rating)}
							{@const selected = defaultRating === rating}
							<Button
								type="button"
								profile={selected ? 'active' : 'plain'}
								size="large"
								class="tabular-nums"
								aria-pressed={selected}
								onclick={() => (defaultRating = rating)}
							>
								{rating}
							</Button>
						{/each}
					</div>
				</Field>
			</Form>
		</CardContent>
	</Card>
</TrackerPage>

<PageActionBar mobileOnly={false}>
<SettingsSaveBar form="happiness-settings" {saving} {dirty} backHref="/happiness" />
</PageActionBar>
