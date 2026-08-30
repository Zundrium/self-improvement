<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { StretchSettingsData } from '$lib/api-types';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';

	let { settings }: { settings: StretchSettingsData } = $props();
	let holdSeconds = $state(untrack(() => settings.holdSeconds));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await updateSettings();
			toast.success('Stretch settings updated.');
			await invalidateAll();
		} catch (cause) {
			showError(cause);
		} finally {
			saving = false;
		}
	}

	function updateSettings() {
		return apiRequest<StretchSettingsData>('/api/app/stretch/settings', {
			method: 'PATCH',
			body: JSON.stringify({ holdSeconds })
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

<SettingsSaveBar form="stretch-settings" {saving} backHref="/stretch" />
