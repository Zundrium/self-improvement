<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { StretchSettingsData } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { settings }: { settings: StretchSettingsData } = $props();
let holdSeconds = $state(untrack(() => settings.holdSeconds));
let saving = $state(false);
let savedHoldSeconds = $state(untrack(() => settings.holdSeconds));
const dirty = $derived(holdSeconds !== savedHoldSeconds);
guardUnsavedNavigation(() => dirty && !saving);
$effect(() => {
	if (!dirty && !saving && settings.holdSeconds !== savedHoldSeconds)
		holdSeconds = savedHoldSeconds = settings.holdSeconds;
});

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	const submitted = Number(holdSeconds);
	try {
		await updateSettings(submitted);
		savedHoldSeconds = submitted;
		toast.success('Stretch settings updated.');
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() =>
			toast.error('Saved, but could not refresh the page.')
		);
	} catch (cause) {
		showError(cause);
	} finally {
		saving = false;
	}
}

function updateSettings(submitted: number) {
	return apiRequest<StretchSettingsData>('/api/app/stretch/settings', {
		method: 'PATCH',
		body: JSON.stringify({ holdSeconds: submitted })
	});
}

function showError(cause: unknown) {
	const message = cause instanceof Error ? cause.message : 'Could not update stretch settings.';
	toast.error(message);
}
</script>

<Card>
	<CardHeader><CardTitle>Routine pace</CardTitle></CardHeader>
	<CardContent>
		<Form id="stretch-settings" class="space-y-0" onsubmit={saveSettings}>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="stretch-hold-seconds">Hold duration in seconds</FieldLabel>
				<Input
					id="stretch-hold-seconds"
					class="w-24 text-right tabular-nums"
					type="number"
					min={5}
					max={600}
					step={5}
					bind:value={holdSeconds}
					required
				/>
			</Field>
		</Form>
	</CardContent>
</Card>

<PageActionBar mobileOnly={false}>
<SettingsSaveBar form="stretch-settings" {saving} {dirty} backHref="/stretch" />
</PageActionBar>
